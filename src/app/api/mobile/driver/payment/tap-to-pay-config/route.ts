import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyMobileToken } from '@/lib/mobile-auth';
import { encrypt, decrypt } from '@/lib/encryption';

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,OPTIONS,POST",
    "Access-Control-Allow-Headers": "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization",
};

export async function OPTIONS() {
    return new Response(null, { status: 204, headers: corsHeaders });
}

export async function GET(request: Request) {
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
        console.log(`[TapToPay Config] Driver: ${driver.id}, Tenant: ${tenant.id}, hasTapToPay: ${tenant.hasTapToPay}`);

        // Entitlement Lockout: Check if Tap to Pay add-on is toggled on in the Super Admin
        if (!tenant.hasTapToPay) {
            return NextResponse.json({
                success: true,
                enabled: false,
                message: "Tap to Pay add-on is disabled for this fleet."
            }, { headers: corsHeaders });
        }

        // Determine payment gateway provider based on keys configured
        let provider = 'STRIPE'; // Stripe is the default
        let stripePublishableKey = tenant.stripePublishableKey || null;
        let sumupAccessToken = null;

        // Check if Stripe is configured
        const hasStripe = !!(decrypt(tenant.stripeSecretKey) as string);
        
        // Check if SumUp is configured
        let hasSumUp = false;
        if (tenant.paymentRouting === 'CENTRAL') {
            sumupAccessToken = decrypt(tenant.sumupAccessToken);
            hasSumUp = !!decrypt(tenant.sumupAccessToken);
        } else {
            sumupAccessToken = decrypt(driver.sumupAccessToken);
            hasSumUp = !!decrypt(driver.sumupAccessToken);
        }

        if (!hasStripe && hasSumUp) {
            provider = 'SUMUP';
        } else if (!hasStripe && !hasSumUp) {
            return NextResponse.json({
                success: true,
                enabled: false,
                message: "No payment gateways (Stripe or SumUp) are configured for this tenant."
            }, { headers: corsHeaders });
        }

        return NextResponse.json({
            success: true,
            enabled: true,
            provider,
            stripePublishableKey,
            sumupAccessToken: provider === 'SUMUP' ? sumupAccessToken : null
        }, { headers: corsHeaders });

    } catch (error) {
        console.error("GET /api/mobile/driver/payment/tap-to-pay-config error:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500, headers: corsHeaders });
    }
}
