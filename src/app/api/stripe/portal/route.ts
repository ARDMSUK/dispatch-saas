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

        // Safe base URL builder for Stripe return redirect
        let baseUrl = 'https://app.cabai.co.uk'; // Safe production default

        if (process.env.NEXT_PUBLIC_APP_URL) {
            baseUrl = process.env.NEXT_PUBLIC_APP_URL;
        } else {
            const host = req.headers.get("host") || "";
            const origin = req.headers.get("origin") || req.nextUrl.origin || "";
            const derivedHost = host || (origin ? new URL(origin).host : "");
            
            if (derivedHost === "app.cabai.co.uk") {
                baseUrl = `https://${derivedHost}`;
            } else if (derivedHost.endsWith(".vercel.app")) {
                baseUrl = `https://${derivedHost}`;
            } else if (process.env.NODE_ENV !== "production" && (derivedHost.startsWith("localhost:") || derivedHost.startsWith("127.0.0.1:"))) {
                baseUrl = `http://${derivedHost}`;
            }
        }
        
        baseUrl = baseUrl.replace(/\/$/, "");
        const returnUrl = `${baseUrl}/dashboard/settings/billing`;

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
