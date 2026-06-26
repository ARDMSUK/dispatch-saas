
import { NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export async function POST(req: Request) {
    try {
        console.log(`[Phase20Z-DIAG] POST /api/create-payment-intent hit`);
        const session = await auth();
        const isAuthenticated = !!session?.user?.tenantId;

        const body = await req.json();
        const { amount, currency = 'gbp', bookingDetails } = body;

        if (!amount || amount < 0.50) { // Minimum 50p
            return NextResponse.json({ error: "Invalid amount (Minimum £0.50)" }, { status: 400 });
        }

        let tenantIdSource = 'fallback/env';
        let tenantId = null;

        if (isAuthenticated) {
            tenantId = session?.user?.tenantId;
            tenantIdSource = 'JWT/session';
        } else if (bookingDetails?.tenantId) {
            tenantId = bookingDetails.tenantId;
            tenantIdSource = 'bookingDetails.tenantId';
        } else if (body.bookingId) {
            tenantIdSource = 'slug/bookingId';
        }

        console.log(`[Phase20Z-DIAG] isAuthenticated: ${isAuthenticated}, tenantIdSource: ${tenantIdSource}, resolved tenantId: ${tenantId}`);

        let tenant = null;
        if (tenantId) {
            tenant = await prisma.tenant.findUnique({
                where: { id: tenantId }
            });
        }

        let stripeKeySource = 'unknown';
        let apiKey = null;

        if (tenant?.stripeSecretKey) {
            apiKey = tenant.stripeSecretKey;
            stripeKeySource = 'tenant DB key';
        } else if (process.env.STRIPE_SECRET_KEY) {
            apiKey = process.env.STRIPE_SECRET_KEY;
            stripeKeySource = 'environment STRIPE_SECRET_KEY';
        }

        if (!apiKey) {
            console.log(`[Phase20Z-DIAG] No API key found for this request.`);
            return NextResponse.json({ error: "Payment configuration missing for this tenant" }, { status: 500 });
        }

        const maskedKey = apiKey.substring(0, 8) + '...' + apiKey.substring(apiKey.length - 4);
        console.log(`[Phase20Z-DIAG] stripeKeySource: ${stripeKeySource}, maskedKey: ${maskedKey}, tenantName: ${tenant?.name || 'System'}`);

        const stripe = getStripe(apiKey);
        let accountId = 'unknown';
        try {
            const acc = await stripe.accounts.retrieve();
            accountId = acc.id;
        } catch (err: any) {
            accountId = `error: ${err.code || err.type}`;
        }
        
        console.log(`[Phase20Z-DIAG] Stripe account ID: ${accountId}`);

        const paymentPurpose = isAuthenticated ? 'operator_console_card_booking' : 'web_booker_card_payment';

        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(amount * 100),
            currency: currency,
            automatic_payment_methods: {
                enabled: true,
            },
            metadata: {
                tenantId: tenantId || 'system',
                customerEmail: bookingDetails?.passengerEmail || 'unknown',
                paymentPurpose: paymentPurpose
            }
        });

        console.log(`[Phase20Z-DIAG] Created PaymentIntent: ${paymentIntent.id}, amount: ${paymentIntent.amount}, currency: ${paymentIntent.currency}, paymentPurpose: ${paymentIntent.metadata.paymentPurpose}`);

        return NextResponse.json({
            clientSecret: paymentIntent.client_secret,
            id: paymentIntent.id
        });

    } catch (error: any) {
        console.error("Payment Intent Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
