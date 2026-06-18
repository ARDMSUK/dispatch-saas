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

                if (session.metadata?.tenantId) {
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

                    if (session.metadata.planId) {
                        const planExists = await prisma.saasPlan.findUnique({
                            where: { id: session.metadata.planId },
                        });

                        if (planExists) {
                            updateData.subscriptionPlanId = session.metadata.planId;
                        } else {
                            console.warn(`Webhook Warning: Invalid planId '${session.metadata.planId}' passed for Tenant ${session.metadata.tenantId}. Activating without a specific plan.`);
                        }
                    }

                    await prisma.tenant.update({
                        where: { id: session.metadata.tenantId },
                        data: updateData,
                    });
                    console.log(`✅ Activated subscription for Tenant ${session.metadata.tenantId} on ${billingInterval}ly cycle`);
                }
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
