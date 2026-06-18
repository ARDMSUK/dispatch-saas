import { NextRequest, NextResponse } from "next/server";
import { systemStripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function POST(req: NextRequest) {
    try {
        const session = await auth();
        if (!session || !session.user || !session.user.tenantId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { priceId, interval = "week" } = await req.json();

        if (interval !== "week" && interval !== "month") {
            return NextResponse.json({ error: "Invalid billing interval" }, { status: 400 });
        }

        if (!systemStripe) {
            return NextResponse.json({ error: "Stripe not configured on platform" }, { status: 500 });
        }

        const tenant = await prisma.tenant.findUnique({
            where: { id: session.user.tenantId },
            include: { subscriptionPlan: true }
        });

        if (!tenant) {
            return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
        }

        let plan = tenant.subscriptionPlan;
        if (!plan) {
            plan = await prisma.saasPlan.findFirst({ where: { name: "Solo" } });
        }

        const line_items: any[] = [];
        const driverCount = await prisma.driver.count({ where: { tenantId: tenant.id } });

        if (interval === "week") {
            // 1. Base Plan Weekly
            if (plan && plan.priceWeekly > 0) {
                line_items.push({
                    price_data: {
                        currency: "gbp",
                        product_data: { name: `${plan.name} Plan - Base Weekly` },
                        unit_amount: Math.round(plan.priceWeekly * 100),
                        recurring: { interval: "week" },
                    },
                    quantity: 1,
                });
            }

            // 2. Per Driver Fee Weekly
            if (plan && plan.pricePerDriverWeekly > 0 && driverCount > 0) {
                line_items.push({
                    price_data: {
                        currency: "gbp",
                        product_data: { name: "Active Drivers Fee (Weekly)" },
                        unit_amount: Math.round(plan.pricePerDriverWeekly * 100),
                        recurring: { interval: "week" },
                    },
                    quantity: driverCount,
                });
            }

            // 3. Custom Addons (Weekly only for now)
            const customAddons = tenant.customAddonPrices as Record<string, number> | null;
            if (customAddons) {
                for (const [addonName, price] of Object.entries(customAddons)) {
                    if (typeof price === 'number' && price > 0) {
                        line_items.push({
                            price_data: {
                                currency: "gbp",
                                product_data: { name: `Add-on: ${addonName}` },
                                unit_amount: Math.round(price * 100),
                                recurring: { interval: "week" },
                            },
                            quantity: 1,
                        });
                    }
                }
            }
        } else if (interval === "month") {
            // 1. Base Plan Monthly
            if (plan && plan.priceMonthly > 0) {
                line_items.push({
                    price_data: {
                        currency: "gbp",
                        product_data: { name: `${plan.name} Plan - Base Monthly` },
                        unit_amount: Math.round(plan.priceMonthly * 100),
                        recurring: { interval: "month" },
                    },
                    quantity: 1,
                });
            }

            // 2. Per Driver Fee Monthly
            if (plan && plan.pricePerDriverMonthly > 0 && driverCount > 0) {
                line_items.push({
                    price_data: {
                        currency: "gbp",
                        product_data: { name: "Active Drivers Fee (Monthly)" },
                        unit_amount: Math.round(plan.pricePerDriverMonthly * 100),
                        recurring: { interval: "month" },
                    },
                    quantity: driverCount,
                });
            }

            // Note: Custom Add-ons are explicitly omitted for "month" interval
            // per Option A implementation to prevent unsafe flat-rate overcharging.
        }

        if (line_items.length === 0) {
            return NextResponse.json({ error: "No chargeable items found for this plan configuration" }, { status: 400 });
        }

        // Return URL when checkout is completed/cancelled
        const returnUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/settings/billing`;

        const checkoutSessionOptions: any = {
            mode: "subscription",
            payment_method_types: ["card"],
            line_items: line_items,
            success_url: `${returnUrl}?success=true&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${returnUrl}?canceled=true`,
            metadata: {
                tenantId: tenant.id,
                planId: plan?.id || "",
                billingInterval: interval,
            },
        };

        // Attach existing Stripe Customer ID if we have one
        if (tenant.stripeCustomerId) {
            checkoutSessionOptions.customer = tenant.stripeCustomerId;
        } else {
            checkoutSessionOptions.customer_email = tenant.email || session.user.email;
        }

        let stripeSession;
        try {
            stripeSession = await systemStripe.checkout.sessions.create(checkoutSessionOptions);
        } catch (error: any) {
            // Detect if Stripe rejected the customer ID (e.g., test-mode ID on live-mode keys)
            const isCustomerError = error?.code === 'resource_missing' || 
                                    error?.message?.includes('No such customer') || 
                                    error?.param === 'customer';

            if (isCustomerError && checkoutSessionOptions.customer) {
                console.warn(`[Stripe Fallback] Invalid customer ID detected for tenant ${tenant.id}. Clearing ID and retrying...`);
                
                // Clear the invalid customer from the payload
                delete checkoutSessionOptions.customer;
                checkoutSessionOptions.customer_email = tenant.email || session.user.email;

                // Clear it in the database so future attempts don't hit the same error
                await prisma.tenant.update({
                    where: { id: tenant.id },
                    data: { stripeCustomerId: null }
                });

                // Retry session creation once
                stripeSession = await systemStripe.checkout.sessions.create(checkoutSessionOptions);
            } else {
                // Not an invalid customer error, or retry failed, propagate to outer catch
                throw error;
            }
        }

        return NextResponse.json({ url: stripeSession.url });
    } catch (error) {
        console.error("Error creating stripe checkout session:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
