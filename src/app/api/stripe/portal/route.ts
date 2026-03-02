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

        if (!systemStripe) {
            return NextResponse.json({ error: "Stripe not configured on platform" }, { status: 500 });
        }

        const tenant = await prisma.tenant.findUnique({
            where: { id: session.user.tenantId }
        });

        if (!tenant || !tenant.stripeCustomerId) {
            return NextResponse.json({ error: "No billing profile found" }, { status: 400 });
        }

        const returnUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/settings/billing`;

        const portalSession = await systemStripe.billingPortal.sessions.create({
            customer: tenant.stripeCustomerId,
            return_url: returnUrl,
        });

        return NextResponse.json({ url: portalSession.url });
    } catch (error) {
        console.error("Error creating customer portal session:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
