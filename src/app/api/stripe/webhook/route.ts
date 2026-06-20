import { NextRequest, NextResponse } from "next/server";
import { systemStripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import Stripe from "stripe";

export async function POST(req: NextRequest) {
    const rawBody = await req.text();
    const signature = req.headers.get("stripe-signature");

    if (!signature || !systemStripe) {
        return NextResponse.json({ error: "Missing Stripe signature or client" }, { status: 400 });
    }

    let event: Stripe.Event;

    try {
        event = systemStripe.webhooks.constructEvent(
            rawBody,
            signature,
            process.env.STRIPE_WEBHOOK_SECRET!
        );
    } catch (err: any) {
        console.error("Webhook signature verification failed.", err.message);
        return NextResponse.json({ error: "Webhook signature verification failed" }, { status: 400 });
    }

    try {
        switch (event.type) {
            case "checkout.session.completed": {
                const session = event.data.object as Stripe.Checkout.Session;

                // 1. Job Payment Classification
                if (session.metadata?.jobId) {
                    const jobId = parseInt(session.metadata.jobId, 10);
                    const tenantId = session.metadata.tenantId;

                    if (isNaN(jobId) || !tenantId) {
                        console.warn(`[Webhook] Job payment invalid metadata. jobId: ${session.metadata.jobId}, tenantId: ${tenantId}`);
                        break;
                    }

                    const job = await prisma.job.findUnique({ where: { id: jobId } });

                    if (!job) {
                        console.warn(`[Webhook] Job ${jobId} not found.`);
                        break;
                    }

                    if (job.tenantId !== tenantId) {
                        console.warn(`[Webhook] Job ${jobId} tenant mismatch. Expected ${job.tenantId}, got ${tenantId}.`);
                        break;
                    }

                    if (job.paymentStatus === 'PAID') {
                        console.log(`[Webhook] Job ${jobId} already paid. Skipping duplicate side effects.`);
                        break;
                    }

                    if (session.payment_status === 'paid') {
                        await prisma.job.update({
                            where: { id: jobId },
                            data: {
                                paymentStatus: 'PAID',
                                paymentType: 'CARD',
                                paymentProvider: 'STRIPE',
                                paymentReferenceId: (session.payment_intent as string) || session.id
                            }
                        });
                        console.log(`✅ Marked Job ${jobId} as PAID`);
                    } else {
                        console.warn(`[Webhook] Job ${jobId} session completed but payment_status is ${session.payment_status}.`);
                    }
                }
                // 2. SaaS Subscription Classification
                else if (session.mode === 'subscription' && session.metadata?.tenantId && session.metadata?.planId) {
                    const rawInterval = session.metadata.billingInterval;
                    const billingInterval = rawInterval === "month" ? "month" : "week";

                    const updateData: {
                        stripeCustomerId: string;
                        stripeSubscriptionId: string;
                        subscriptionStatus: string;
                        subscriptionPlanId?: string;
                        billingInterval: string;
                    } = {
                        stripeCustomerId: session.customer as string,
                        stripeSubscriptionId: session.subscription as string,
                        subscriptionStatus: "ACTIVE",
                        billingInterval,
                    };

                    const planExists = await prisma.saasPlan.findUnique({
                        where: { id: session.metadata.planId },
                    });

                    if (planExists) {
                        updateData.subscriptionPlanId = session.metadata.planId;
                    } else {
                        console.warn(`[Webhook] Warning: Invalid planId '${session.metadata.planId}' passed for Tenant ${session.metadata.tenantId}. Activating without a specific plan.`);
                    }

                    await prisma.tenant.update({
                        where: { id: session.metadata.tenantId },
                        data: updateData,
                    });
                    console.log(`✅ Activated subscription for Tenant ${session.metadata.tenantId} on ${billingInterval}ly cycle`);
                } 
                // 3. Ambiguous session
                else if (session.metadata?.tenantId) {
                    console.warn(`[Webhook] Ambiguous session for tenant ${session.metadata.tenantId}. No jobId, and not a clear subscription checkout.`);
                break;
            }
            case "payment_intent.succeeded": {
                const intent = event.data.object as Stripe.PaymentIntent;
                const metaBookingId = intent.metadata?.bookingId || intent.metadata?.jobId;
                const metaTenantId = intent.metadata?.tenantId;
                const isBookingPayment = intent.metadata?.paymentType === 'booking_payment' || (metaBookingId && metaTenantId);

                if (!isBookingPayment) {
                    console.warn(`[Webhook] Ambiguous or missing metadata for payment_intent ${intent.id}. Skipping.`);
                    break;
                }

                const jobId = parseInt(metaBookingId!, 10);
                if (isNaN(jobId) || !metaTenantId) {
                    console.warn(`[Webhook] Invalid jobId or tenantId for payment_intent ${intent.id}. Skipping.`);
                    break;
                }

                const job = await prisma.job.findUnique({ where: { id: jobId } });
                if (!job) {
                    console.warn(`[Webhook] Job ${jobId} not found for payment_intent ${intent.id}.`);
                    break;
                }

                if (job.tenantId !== metaTenantId) {
                    console.warn(`[Webhook] Job ${jobId} tenant mismatch. Expected ${job.tenantId}, got ${metaTenantId}.`);
                    break;
                }

                // Amount check safely (job.fare in pounds vs intent.amount in pence)
                const expectedAmount = Math.round((job.fare || 0) * 100);
                if (intent.amount !== expectedAmount) {
                    console.warn(`[Webhook] Amount mismatch for Job ${job.id}. Expected ${expectedAmount}, got ${intent.amount}. Skipping payment auto-sync.`);
                    break;
                }

                if (job.paymentStatus === 'PAID') {
                    if (job.paymentReferenceId && job.paymentReferenceId !== intent.id) {
                        console.warn(`[Webhook] Job ${jobId} is already paid with reference ${job.paymentReferenceId}. Skipping intent ${intent.id}.`);
                    } else {
                        console.log(`[Webhook] Job ${jobId} already paid with same reference. No-op.`);
                    }
                    break;
                }

                await prisma.job.update({
                    where: { id: jobId },
                    data: {
                        paymentStatus: 'PAID',
                        paymentType: 'CARD',
                        paymentProvider: 'STRIPE',
                        paymentReferenceId: intent.id
                    }
                });
                console.log(`✅ [Webhook] Marked Job ${jobId} as PAID from payment_intent.succeeded`);
                break;
            }
            case "customer.subscription.updated": {
                const subscription = event.data.object as Stripe.Subscription;
                await prisma.tenant.updateMany({
                    where: { stripeSubscriptionId: subscription.id },
                    data: {
                        subscriptionStatus: subscription.status === "active" || subscription.status === "trialing" ? "ACTIVE" : "PAST_DUE",
                    },
                });
                break;
            }
            case "customer.subscription.deleted": {
                const subscription = event.data.object as Stripe.Subscription;
                await prisma.tenant.updateMany({
                    where: { stripeSubscriptionId: subscription.id },
                    data: {
                        subscriptionStatus: "CANCELED",
                    },
                });
                console.log(`❌ Subscription canceled for ${subscription.id}`);
                break;
            }
            default:
                console.log(`Unhandled event type: ${event.type}`);
        }
    } catch (err: any) {
        console.error("Error processing webhook event", err);
        return NextResponse.json({ error: "Database update failed" }, { status: 500 });
    }

    return NextResponse.json({ received: true });
}
