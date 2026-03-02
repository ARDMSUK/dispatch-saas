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
            where: { id: session.user.tenantId }
        });

        if (!tenant) {
            return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
        }

        // Return URL when checkout is completed/cancelled
        const returnUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/settings/billing`;

        const checkoutSessionOptions: any = {
            mode: "subscription",
            payment_method_types: ["card"],
            line_items: [
                {
                    price: priceId,
                    quantity: 1,
                },
            ],
            success_url: `${returnUrl}?success=true&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${returnUrl}?canceled=true`,
            metadata: {
                tenantId: tenant.id,
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
