
import { NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export async function POST(req: Request) {
    try {
        const session = await auth();
        const isAuthenticated = !!session?.user?.tenantId;

        const body = await req.json();
        const { amount, currency = 'gbp', bookingDetails } = body;

        if (!amount || amount < 0.50) { // Minimum 50p
            return NextResponse.json({ error: "Invalid amount (Minimum £0.50)" }, { status: 400 });
        }

        let tenantId = null;

        if (isAuthenticated) {
            tenantId = session?.user?.tenantId;
        } else if (bookingDetails?.tenantId) {
            tenantId = bookingDetails.tenantId;
        } else if (body.bookingId) {
            // No direct tenant id mapping for slug alone here, fallback
        }

        let tenant = null;
        if (tenantId) {
            tenant = await prisma.tenant.findUnique({
                where: { id: tenantId }
            });
        }

        let apiKey = null;

        if (tenant?.stripeSecretKey) {
            apiKey = tenant.stripeSecretKey;
        } else if (process.env.STRIPE_SECRET_KEY) {
            apiKey = process.env.STRIPE_SECRET_KEY;
        }

        if (!apiKey) {
            return NextResponse.json({ error: "Payment configuration missing for this tenant" }, { status: 500 });
        }

        const stripe = getStripe(apiKey);

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

        return NextResponse.json({
            clientSecret: paymentIntent.client_secret,
            id: paymentIntent.id
        });

    } catch (error: any) {
        console.error("Payment Intent Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
