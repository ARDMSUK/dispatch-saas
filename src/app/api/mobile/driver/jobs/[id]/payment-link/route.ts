import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyMobileToken } from '@/lib/mobile-auth';
import { getStripe, systemStripe } from '@/lib/stripe';
import { encrypt, decrypt } from '@/lib/encryption';

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

        const driverId = (payload.driverId || payload.id) as string;
        const { id } = await params;
        const jobId = parseInt(id);

        if (isNaN(jobId)) {
            return NextResponse.json({ error: 'Invalid Job ID' }, { status: 400, headers: corsHeaders });
        }

        const driver = await prisma.driver.findUnique({ where: { id: driverId } });
        if (!driver) {
             return NextResponse.json({ error: 'Driver not found' }, { status: 404, headers: corsHeaders });
        }

        // Verify Job Ownership
        const job = await prisma.job.findFirst({
            where: { id: jobId, driverId: driver.id, tenantId: driver.tenantId },
            include: { tenant: true }
        });

        if (!job || !job.tenant) {
            return NextResponse.json({ error: 'Job or tenant not found' }, { status: 404, headers: corsHeaders });
        }

        // Block if paid, refunded, or cancelled
        if (job.paymentStatus === 'PAID' || job.paymentStatus === 'REFUNDED') {
            return NextResponse.json({ error: 'Job is already paid or refunded', isPaid: true }, { status: 400, headers: corsHeaders });
        }

        if (['CANCELLED', 'COMPLETED', 'NO_SHOW'].includes(job.status)) {
            return NextResponse.json({ error: `Cannot generate payment link for a ${job.status} job` }, { status: 400, headers: corsHeaders });
        }

        // Reuse existing unpaid Stripe payment link
        if (job.paymentLink && job.paymentProvider === 'STRIPE' && !job.paymentLink.includes('sumup')) {
            return NextResponse.json({
                success: true,
                url: job.paymentLink,
                reused: true
            }, { headers: corsHeaders });
        }

        // Validate fare amount
        if (job.fare === null || job.fare === undefined || isNaN(job.fare) || job.fare <= 0) {
            return NextResponse.json({ error: 'Invalid or missing fare amount for this job' }, { status: 400, headers: corsHeaders });
        }

        const tenant = job.tenant;
        let validTenantKey = null;
        if ((decrypt(tenant.stripeSecretKey) as string)) {
            if ((decrypt(tenant.stripeSecretKey) as string).startsWith('sk_live_') || 
                (decrypt(tenant.stripeSecretKey) as string).startsWith('sk_test_') || 
                (decrypt(tenant.stripeSecretKey) as string).startsWith('rk_live_') || 
                (decrypt(tenant.stripeSecretKey) as string).startsWith('rk_test_')) {
                validTenantKey = (decrypt(tenant.stripeSecretKey) as string);
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

        // Cancel stale Web Booker PaymentIntent if present
        if (job.stripePaymentIntentId && !job.paymentReferenceId && job.stripePaymentIntentId.startsWith('pi_')) {
            try {
                const intent = await stripeClient.paymentIntents.retrieve(job.stripePaymentIntentId);
                if (intent) {
                    if (intent.status === 'requires_payment_method') {
                        await stripeClient.paymentIntents.cancel(job.stripePaymentIntentId);
                        console.log(`[Stripe] Cancelled stale PaymentIntent ${job.stripePaymentIntentId.substring(0, 14)}... for Job ${job.id}`);
                    } else if (intent.status === 'canceled') {
                        console.log(`[Stripe] Existing PaymentIntent ${job.stripePaymentIntentId.substring(0, 14)}... is already canceled for Job ${job.id}; continuing to Checkout Session.`);
                    } else {
                        return NextResponse.json(
                            { error: 'Existing card payment is already in progress or not safely cancellable for this job. Please wait for the payment to complete or fail before generating another payment link.' },
                            { status: 409, headers: corsHeaders }
                        );
                    }
                }
            } catch (cancelError: any) {
                console.warn(`[Stripe] Failed to retrieve or cancel stale PaymentIntent ${job.stripePaymentIntentId.substring(0, 14)}...`, cancelError.message);
                const errorCode = cancelError.raw?.code || cancelError.code;
                if (errorCode !== 'resource_missing') {
                    return NextResponse.json({ error: 'Failed to verify existing payment status with Stripe. Please try again.' }, { status: 502, headers: corsHeaders });
                }
            }
        }

        // Create Checkout Session
        const stripeSession = await stripeClient.checkout.sessions.create(
            {
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
            },
            {
                idempotencyKey: `checkout_session_job_${job.id}`,
            }
        );

        if (!stripeSession.url) {
             return NextResponse.json({ error: 'Failed to generate checkout session' }, { status: 500, headers: corsHeaders });
        }

        // Save the generated link and update provider to STRIPE, but do NOT mark as paid
        const updateResult = await prisma.job.updateMany({
            where: { id: job.id, tenantId: driver.tenantId, driverId: driver.id },
            data: {
                paymentLink: stripeSession.url,
                paymentProvider: 'STRIPE'
            }
        });

        if (updateResult.count !== 1) {
            await stripeClient.checkout.sessions.expire(stripeSession.id).catch(e => console.error("Failed to expire session", e));
            return NextResponse.json({ error: 'Failed to save payment link to job due to state change or tenant mismatch' }, { status: 409, headers: corsHeaders });
        }

        return NextResponse.json({ 
            success: true, 
            url: stripeSession.url,
            reused: false
        }, { headers: corsHeaders });

    } catch (error: any) {
        const rawMessage = error instanceof Error ? error.message : 'Unknown error';
        
        // Redact any potential keys from the log
        const redactedMessage = rawMessage.replace(/(sk_live|sk_test|rk_live|rk_test|mk)_[a-zA-Z0-9]+/g, '[REDACTED_KEY]');
        console.error("POST /api/mobile/driver/jobs/[id]/payment-link error:", redactedMessage);
        
        // Return only safe generic error message to frontend
        let safeErrorMessage = 'Unable to create payment link for this job.';
        if (rawMessage.includes('API Key') || rawMessage.includes('Invalid API Key')) {
            safeErrorMessage = 'Stripe checkout creation failed. Please check payment configuration.';
        }
        
        return NextResponse.json({ error: safeErrorMessage }, { status: 500, headers: corsHeaders });
    }
}
