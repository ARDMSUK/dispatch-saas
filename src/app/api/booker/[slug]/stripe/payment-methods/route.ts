import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import Stripe from 'stripe';
import { encrypt, decrypt } from '@/lib/encryption';
import { verifyPassengerToken } from '@/lib/passenger-auth';

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,OPTIONS",
    "Access-Control-Allow-Headers": "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization",
};

export async function OPTIONS() {
    return new Response(null, { status: 204, headers: corsHeaders });
}

export async function GET(
    req: Request,
    { params }: { params: Promise<{ slug: string }> }
) {
    try {
        const { slug } = await params;
        
        const authPayload = await verifyPassengerToken(req);
        if (!authPayload) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
        }

        const tenant = await prisma.tenant.findUnique({
            where: { slug: slug }
        });

        if (!tenant || !(decrypt(tenant.stripeSecretKey) as string)) {
            return NextResponse.json({ error: 'Tenant or Stripe configuration not found' }, { status: 404, headers: corsHeaders });
        }
        
        if (tenant.id !== authPayload.tenantId) {
            return NextResponse.json({ error: 'Unauthorized for this tenant' }, { status: 403, headers: corsHeaders });
        }

        const customer = await prisma.customer.findUnique({
            where: {
                id: authPayload.customerId
            }
        });

        if (!customer || !customer.stripeCustomerId) {
            return NextResponse.json({ paymentMethods: [] }, { headers: corsHeaders });
        }

        const stripe = new Stripe((decrypt(tenant.stripeSecretKey) as string), {
            apiVersion: '2025-02-24.acacia' as any,
        });

        const paymentMethods = await stripe.paymentMethods.list({
            customer: customer.stripeCustomerId,
            type: 'card',
        });

        return NextResponse.json({
            paymentMethods: paymentMethods.data.map(pm => ({
                id: pm.id,
                brand: pm.card?.brand,
                last4: pm.card?.last4,
                expMonth: pm.card?.exp_month,
                expYear: pm.card?.exp_year,
            }))
        }, { headers: corsHeaders });

    } catch (error: any) {
        console.error('Fetch payment methods error:', error);
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500, headers: corsHeaders });
    }
}
