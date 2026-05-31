import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import Stripe from 'stripe';
import { EmailService } from '@/lib/email-service';
import { SmsService } from '@/lib/sms-service';
import { DispatchEngine } from '@/lib/dispatch-engine';

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,OPTIONS,PATCH,DELETE,POST,PUT",
    "Access-Control-Allow-Headers": "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version",
};

export async function OPTIONS() {
    return new Response(null, { status: 204, headers: corsHeaders });
}

export async function POST(
    req: Request,
    { params }: { params: Promise<{ slug: string }> }
) {
    try {
        const { slug } = await params;
        const { jobId, paymentIntentId } = await req.json();

        if (!jobId || !paymentIntentId) {
            return NextResponse.json({ error: 'Missing jobId or paymentIntentId' }, { status: 400, headers: corsHeaders });
        }

        const tenant = await prisma.tenant.findUnique({
            where: { slug }
        });

        if (!tenant) {
            return NextResponse.json({ error: 'Tenant not found' }, { status: 404, headers: corsHeaders });
        }

        if (!tenant.stripeSecretKey) {
            return NextResponse.json({ error: 'Stripe is not configured for this tenant' }, { status: 400, headers: corsHeaders });
        }

        // 1. Verify Payment Intent on Stripe directly using Tenant's keys
        const stripe = new Stripe(tenant.stripeSecretKey, {
            apiVersion: '2025-02-24.acacia' as any,
        });

        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

        const isSuccessful = paymentIntent.status === 'succeeded' || paymentIntent.status === 'requires_capture';

        if (!isSuccessful) {
            return NextResponse.json({ error: 'Payment has not been completed successfully' }, { status: 400, headers: corsHeaders });
        }

        // 2. Fetch Job and ensure it belongs to the tenant
        const job = await prisma.job.findFirst({
            where: {
                id: jobId,
                tenantId: tenant.id
            }
        });

        if (!job) {
            return NextResponse.json({ error: 'Booking not found' }, { status: 404, headers: corsHeaders });
        }

        // 3. Update Job Payment Status to PAID
        const updatedJob = await prisma.job.update({
            where: { id: job.id },
            data: {
                paymentStatus: 'PAID',
                stripePaymentIntentId: paymentIntentId
            }
        });

        // 4. Trigger Notifications (Confirmation + Receipt)
        const jobWithCustomer = { ...updatedJob, customer: { email: updatedJob.passengerEmail } };
        const notificationPromises = [
            EmailService.sendBookingConfirmation(jobWithCustomer as any, tenant),
            SmsService.sendBookingConfirmation(updatedJob, tenant),
            EmailService.sendPaymentConfirmation(jobWithCustomer as any, tenant)
        ];

        await Promise.allSettled(notificationPromises).then((results) => {
            results.forEach((result, index) => {
                if (result.status === 'rejected') {
                    console.error(`Confirm Payment notification ${index} failed:`, result.reason);
                }
            });
        });

        // 5. Trigger Auto-Dispatch Engine
        if (updatedJob.autoDispatch) {
            DispatchEngine.runDispatchLoop(tenant.id).catch(e => console.error("Auto dispatch run failed after payment confirmation", e));
        }

        return NextResponse.json({
            success: true,
            bookingId: updatedJob.id,
            paymentStatus: updatedJob.paymentStatus
        }, { headers: corsHeaders });

    } catch (error: any) {
        console.error('Error confirming public card payment:', error);
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500, headers: corsHeaders });
    }
}
