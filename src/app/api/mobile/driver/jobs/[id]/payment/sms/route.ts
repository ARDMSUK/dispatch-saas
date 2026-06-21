import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyMobileToken } from '@/lib/mobile-auth';
import { SmsService } from '@/lib/sms-service';
import { getStripe, systemStripe } from '@/lib/stripe';

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

        let job = await prisma.job.findUnique({
            where: { id: jobId },
            include: { tenant: true, customer: true }
        });

        if (!job || !job.tenant) {
            return NextResponse.json({ error: 'Job or tenant not found' }, { status: 404, headers: corsHeaders });
        }

        if (job.driverId !== driverId) {
            return NextResponse.json({ error: 'Forbidden: You are not assigned to this job' }, { status: 403, headers: corsHeaders });
        }

        if (!job.passengerPhone && !job.customerPhone && !job.customer?.phone) {
            return NextResponse.json({ error: 'Customer phone number is required to send SMS' }, { status: 400, headers: corsHeaders });
        }

        // Block if paid, refunded, or cancelled
        if (job.paymentStatus === 'PAID' || job.paymentStatus === 'REFUNDED') {
            return NextResponse.json({ error: 'Job is already paid or refunded', isPaid: true }, { status: 400, headers: corsHeaders });
        }

        if (job.status === 'CANCELLED') {
            return NextResponse.json({ error: 'Cannot send payment link for a cancelled job' }, { status: 400, headers: corsHeaders });
        }

        // Validate fare amount
        if (job.fare === null || job.fare === undefined || isNaN(job.fare) || job.fare <= 0) {
            return NextResponse.json({ error: 'Invalid or missing fare amount for this job' }, { status: 400, headers: corsHeaders });
        }

        let paymentLink = job.paymentLink;

        // Reuse existing unpaid Stripe payment link
        if (!paymentLink || job.paymentProvider !== 'STRIPE' || paymentLink.includes('sumup')) {
            const tenant = job.tenant;
            let validTenantKey = null;
            if (tenant.stripeSecretKey) {
                if (tenant.stripeSecretKey.startsWith('sk_live_') || 
                    tenant.stripeSecretKey.startsWith('sk_test_') || 
                    tenant.stripeSecretKey.startsWith('rk_live_') || 
                    tenant.stripeSecretKey.startsWith('rk_test_')) {
                    validTenantKey = tenant.stripeSecretKey;
                } else {
                    console.warn(`Invalid Stripe key format for tenant ${tenant.id}. Falling back to system Stripe.`);
                }
            }

            const stripeClient = validTenantKey ? getStripe(validTenantKey) : systemStripe;

            if (!stripeClient) {
                return NextResponse.json({ error: 'Stripe is not configured or unavailable' }, { status: 500, headers: corsHeaders });
            }

            // Safe base URL builder
            let baseUrl = 'https://app.cabai.co.uk';
            if (process.env.NEXT_PUBLIC_APP_URL) {
                baseUrl = process.env.NEXT_PUBLIC_APP_URL;
            } else {
                const host = request.headers.get("host") || "";
                const origin = request.headers.get("origin") || "";
                const derivedHost = host || (origin ? new URL(origin).host : "");
                
                if (derivedHost === "app.cabai.co.uk" || derivedHost.endsWith(".vercel.app")) {
                    baseUrl = `https://${derivedHost}`;
                } else if (process.env.NODE_ENV !== "production" && (derivedHost.startsWith("localhost:") || derivedHost.startsWith("127.0.0.1:"))) {
                    baseUrl = `http://${derivedHost}`;
                }
            }
            baseUrl = baseUrl.replace(/\/$/, "");

            const successUrl = `${baseUrl}/job-payment-success?jobId=${job.id}`;
            const cancelUrl = `${baseUrl}/dashboard`;

            // Create Checkout Session
            const stripeSession = await stripeClient.checkout.sessions.create({
                payment_method_types: ['card'],
                line_items: [
                    {
                        price_data: {
                            currency: 'gbp',
                            product_data: {
                                name: `Booking #${job.id} - ${tenant.name}`,
                                description: `${job.pickupAddress} to ${job.dropoffAddress}`,
                            },
                            unit_amount: Math.round(job.fare * 100), // convert to pence
                        },
                        quantity: 1,
                    },
                ],
                mode: 'payment',
                success_url: successUrl,
                cancel_url: cancelUrl,
                client_reference_id: job.id.toString(),
                metadata: {
                    jobId: job.id.toString(),
                    tenantId: tenant.id.toString(),
                    paymentType: "job_payment"
                }
            });

            if (!stripeSession.url) {
                return NextResponse.json({ error: 'Failed to generate checkout session' }, { status: 500, headers: corsHeaders });
            }

            paymentLink = stripeSession.url;

            // Save the generated link and update provider to STRIPE, but do NOT mark as paid
            job = await prisma.job.update({
                where: { id: job.id },
                data: {
                    paymentLink: stripeSession.url,
                    paymentProvider: 'STRIPE'
                },
                include: {
                    tenant: true,
                    customer: true
                }
            });
        }

        const tenantSettings = await prisma.tenant.findUnique({
            where: { id: job.tenantId }
        });

        // Ensure passengerPhone is explicitly passed down if not on top level
        const jobForSms = { ...job, passengerPhone: job.passengerPhone || job.customerPhone || job.customer?.phone };

        const smsResult = await SmsService.sendPaymentLink(jobForSms, tenantSettings);

        if (smsResult && smsResult.success === false) {
            return NextResponse.json({ error: smsResult.error || 'SMS failed' }, { status: 500, headers: corsHeaders });
        }

        return NextResponse.json({ success: true, smsResult, reused: !!job.paymentLink && job.paymentLink === paymentLink }, { headers: corsHeaders });

    } catch (error: any) {
        let rawMessage = error instanceof Error ? error.message : 'Unknown error';
        
        // Redact any potential keys from the log
        const redactedMessage = rawMessage.replace(/(sk_live|sk_test|rk_live|rk_test|mk)_[a-zA-Z0-9]+/g, '[REDACTED_KEY]');
        console.error("POST /api/mobile/driver/jobs/[id]/payment/sms error:", redactedMessage);
        
        // Return only safe generic error message to frontend
        let safeErrorMessage = 'Unable to send payment link SMS for this job.';
        if (rawMessage.includes('API Key') || rawMessage.includes('Invalid API Key')) {
            safeErrorMessage = 'Stripe checkout creation failed. Please check payment configuration.';
        }
        
        return NextResponse.json({ error: safeErrorMessage }, { status: 500, headers: corsHeaders });
    }
}
