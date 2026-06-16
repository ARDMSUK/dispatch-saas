import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyMobileToken } from '@/lib/mobile-auth';
import { getStripe, systemStripe } from '@/lib/stripe';
import { SmsService } from '@/lib/sms-service';
import { EmailService } from '@/lib/email-service';

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "OPTIONS,POST",
    "Access-Control-Allow-Headers": "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization",
};

export async function OPTIONS() {
    return new Response(null, { status: 204, headers: corsHeaders });
}

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const authHeader = request.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
        }

        const token = authHeader.split(' ')[1];
        const payload = await verifyMobileToken(token);

        if (!payload || (!payload.id && !payload.driverId)) {
            return NextResponse.json({ error: 'Invalid token' }, { status: 401, headers: corsHeaders });
        }

        const driverId = payload.driverId || payload.id;
        const { id } = await params;
        const jobId = parseInt(id);

        if (isNaN(jobId)) {
            return NextResponse.json({ error: 'Invalid Job ID' }, { status: 400, headers: corsHeaders });
        }

        const body = await request.json();
        const { sendSms, sendEmail, phoneOverride, emailOverride } = body;

        // Verify Job Ownership
        const job = await prisma.job.findUnique({
            where: { id: jobId },
            include: { customer: true, tenant: true }
        });

        if (!job || !job.tenant) {
            return NextResponse.json({ error: 'Job or tenant not found' }, { status: 404, headers: corsHeaders });
        }

        if (job.driverId !== driverId) {
            return NextResponse.json({ error: 'Forbidden: You are not assigned to this job' }, { status: 403, headers: corsHeaders });
        }

        const tenant = job.tenant;
        const stripeClient = tenant.stripeSecretKey ? getStripe(tenant.stripeSecretKey) : systemStripe;

        if (!stripeClient) {
            return NextResponse.json({ error: 'Stripe is not configured for this tenant' }, { status: 500, headers: corsHeaders });
        }

        // Base App URL
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://dispatch.cabai.co.uk';
        const successUrl = `${baseUrl}/payment-success`;

        // Create Checkout Session
        const session = await stripeClient.checkout.sessions.create({
            payment_method_types: ['card', 'link', 'apple_pay', 'google_pay'],
            line_items: [
                {
                    price_data: {
                        currency: 'gbp',
                        product_data: {
                            name: `Booking #${job.id} - ${tenant.name}`,
                            description: `${job.pickupAddress} to ${job.dropoffAddress}`,
                        },
                        unit_amount: Math.round(job.price * 100), // convert to pence
                    },
                    quantity: 1,
                },
            ],
            mode: 'payment',
            success_url: successUrl,
            client_reference_id: job.id.toString(),
            metadata: {
                jobId: job.id.toString(),
                tenantId: tenant.id.toString(),
            }
        });

        if (!session.url) {
             return NextResponse.json({ error: 'Failed to generate checkout session' }, { status: 500, headers: corsHeaders });
        }

        // Handle sending
        let smsResult = null;
        let emailResult = null;

        const augmentedJob = {
            ...job,
            paymentLink: session.url,
            passengerPhone: phoneOverride || job.customerPhone || job.customer?.phone,
            passengerEmail: emailOverride || job.customer?.email,
            fare: job.price
        };

        if (sendSms) {
            smsResult = await SmsService.sendPaymentLink(augmentedJob, tenant);
        }

        if (sendEmail) {
            // Need to ensure EmailService has sendPaymentLink
            if ((EmailService as any).sendPaymentLink) {
                emailResult = await (EmailService as any).sendPaymentLink(augmentedJob, tenant);
            }
        }

        return NextResponse.json({ 
            success: true, 
            url: session.url,
            smsResult,
            emailResult
        }, { headers: corsHeaders });

    } catch (error) {
        console.error("POST /api/mobile/driver/jobs/[id]/payment-link error:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500, headers: corsHeaders });
    }
}
