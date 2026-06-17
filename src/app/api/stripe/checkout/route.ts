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

        const { priceId } = await req.json();

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
        const driverCount = await prisma.driver.count({ where: { tenantId: tenant.id } });
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

        // 3. Custom Addons
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
            },
        };

        // Attach existing Stripe Customer ID if we have one
        if (tenant.stripeCustomerId) {
            checkoutSessionOptions.customer = tenant.stripeCustomerId;
        } else {
            checkoutSessionOptions.customer_email = tenant.email || session.user.email;
        }

        const stripeSession = await systemStripe.checkout.sessions.create(checkoutSessionOptions);

        return NextResponse.json({ url: stripeSession.url });
    } catch (error) {
        console.error("Error creating stripe checkout session:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
