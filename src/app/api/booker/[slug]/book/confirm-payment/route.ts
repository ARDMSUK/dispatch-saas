import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import Stripe from 'stripe';
import { encrypt, decrypt } from '@/lib/encryption';

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

        if (!(decrypt(tenant.stripeSecretKey) as string)) {
            return NextResponse.json({ error: 'Stripe is not configured for this tenant' }, { status: 400, headers: corsHeaders });
        }

        // 1. Verify Payment Intent on Stripe directly using Tenant's keys
        const stripe = new Stripe((decrypt(tenant.stripeSecretKey) as string), {
            apiVersion: '2025-02-24.acacia' as any,
        });

        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

        const isSuccessful = paymentIntent.status === 'succeeded' || paymentIntent.status === 'requires_capture';

        if (!isSuccessful) {
            return NextResponse.json({ error: 'Payment has not been completed successfully' }, { status: 400, headers: corsHeaders });
        }

        // Verify metadata ownership
        const metaBookingId = paymentIntent.metadata?.bookingId;
        const metaJobId = paymentIntent.metadata?.jobId;
        const metaTenantId = paymentIntent.metadata?.tenantId;

        if (String(jobId) !== metaBookingId && String(jobId) !== metaJobId) {
            console.warn(`[ConfirmPayment] Intent mismatch. Expected Job ID ${jobId}, got ${metaBookingId || metaJobId}`);
            return NextResponse.json({ error: 'Payment Intent does not match this booking' }, { status: 400, headers: corsHeaders });
        }

        if (String(tenant.id) !== metaTenantId) {
            console.warn(`[ConfirmPayment] Tenant mismatch. Expected ${tenant.id}, got ${metaTenantId}`);
            return NextResponse.json({ error: 'Payment Intent does not match this tenant' }, { status: 400, headers: corsHeaders });
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

        // Amount safety check
        const expectedAmount = Math.round((job.fare || 0) * 100);
        if (paymentIntent.amount !== expectedAmount) {
            console.warn(`[ConfirmPayment] Amount mismatch for Job ${job.id}. Expected ${expectedAmount}, got ${paymentIntent.amount}`);
            return NextResponse.json({ error: 'Payment amount does not match expected fare' }, { status: 400, headers: corsHeaders });
        }

        // Idempotency check
        if (job.paymentStatus === 'PAID') {
            if (job.paymentReferenceId && job.paymentReferenceId !== paymentIntentId) {
                console.warn(`[ConfirmPayment] Job ${job.id} already paid with different reference ${job.paymentReferenceId}`);
                return NextResponse.json({ error: 'Job is already paid with a different payment reference' }, { status: 400, headers: corsHeaders });
            }
            // If it's already paid with the SAME reference, return success but DO NOT trigger side effects again
            return NextResponse.json({
                success: true,
                alreadyPaid: true,
                bookingId: job.id,
                paymentStatus: job.paymentStatus
            }, { headers: corsHeaders });
        }

        // 3. Delegate DB update and notifications to Stripe webhook.
        return NextResponse.json({
            success: true,
            status: 'PROCESSING',
            bookingId: job.id,
            paymentStatus: 'PROCESSING'
        }, { headers: corsHeaders });

    } catch (error: any) {
        console.error('Error confirming public card payment:', error);
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500, headers: corsHeaders });
    }
}
