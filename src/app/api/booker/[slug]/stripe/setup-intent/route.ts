import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import Stripe from 'stripe';
import { encrypt, decrypt } from '@/lib/encryption';
import { verifyPassengerToken } from '@/lib/passenger-auth';

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,OPTIONS,PATCH,DELETE,POST,PUT",
    "Access-Control-Allow-Headers": "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization",
};

export async function OPTIONS() {
    return new Response(null, { status: 204, headers: corsHeaders });
}

export async function POST(
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

        if (!customer) {
            return NextResponse.json({ error: 'Customer not found' }, { status: 404, headers: corsHeaders });
        }

        const stripe = new Stripe((decrypt(tenant.stripeSecretKey) as string), {
            apiVersion: '2025-02-24.acacia' as any,
        });

        let stripeCustomerId = customer.stripeCustomerId;

        // Create Stripe Customer if one doesn't exist
        if (!stripeCustomerId) {
            const stripeCustomer = await stripe.customers.create({
                name: customer.name || undefined,
                email: customer.email || undefined,
                phone: customer.phone,
                metadata: {
                    tenantId: tenant.id,
                    customerId: customer.id
                }
            });
            
            stripeCustomerId = stripeCustomer.id;

            // Save the stripeCustomerId to the database
            await prisma.customer.update({
                where: { id: customer.id },
                data: { stripeCustomerId: stripeCustomerId }
            });
        }

        // Create a SetupIntent for the customer
        const setupIntent = await stripe.setupIntents.create({
            customer: stripeCustomerId,
            payment_method_types: ['card'],
            usage: 'off_session', // To allow future off-session payments
        });

        return NextResponse.json({
            clientSecret: setupIntent.client_secret,
            publishableKey: tenant.stripePublishableKey
        }, { headers: corsHeaders });

    } catch (error: any) {
        console.error('Setup Intent error:', error);
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500, headers: corsHeaders });
    }
}
