import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyMobileToken } from '@/lib/mobile-auth';
import { getStripe } from '@/lib/stripe';

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,OPTIONS,POST",
    "Access-Control-Allow-Headers": "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization",
};

export async function OPTIONS() {
    return new Response(null, { status: 204, headers: corsHeaders });
}

export async function POST(request: Request) {
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

        const driver = await prisma.driver.findUnique({
            where: { id: driverId as string },
            include: { tenant: true }
        });

        if (!driver || !(driver as any).tenant) {
            return NextResponse.json({ error: 'Driver or Tenant not found' }, { status: 404, headers: corsHeaders });
        }

        const tenant = (driver as any).tenant;

        // Entitlement Lockout: Check if Tap to Pay add-on is toggled on in the Super Admin
        if (!tenant.hasTapToPay) {
            return NextResponse.json({ error: "Forbidden: Tap to Pay add-on is disabled for this fleet." }, { status: 403, headers: corsHeaders });
        }

        // Check if Stripe credentials are present
        const apiKey = tenant.stripeSecretKey || process.env.STRIPE_SECRET_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: "Stripe not configured for this tenant" }, { status: 400, headers: corsHeaders });
        }

        // Call Stripe Terminal API to create a connection token
        const stripe = getStripe(apiKey);
        const connectionToken = await stripe.terminal.connectionTokens.create();

        return NextResponse.json({ secret: connectionToken.secret }, { headers: corsHeaders });

    } catch (error) {
        console.error("POST /api/mobile/driver/payment/connection-token error:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500, headers: corsHeaders });
    }
}
