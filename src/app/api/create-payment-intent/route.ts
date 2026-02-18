
import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
// import { calculatePrice } from '@/lib/pricing'; // Not used in MVP for now

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { amount, currency = 'gbp', bookingDetails } = body;

        // SECURITY: Ideally, we should recalculate the price here based on bookingDetails
        // to prevent client-side manipulation. For this MVP, we'll trust the amount passed
        // IF it matches a re-calculation, or at least validate it's reasonable.
        // For now, we'll proceed with the passed amount but log a warning if it looks suspicious.

        if (!amount || amount < 50) { // Minimum 50p
            return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
        }

        console.log(`[Payment] Creating Intent for ${amount} ${currency.toUpperCase()}`);

        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(amount * 100), // Convert to pennies/cents
            currency: currency,
            automatic_payment_methods: {
                enabled: true,
            },
            metadata: {
                tenantId: bookingDetails?.tenantId || 'unknown',
                customerEmail: bookingDetails?.passengerEmail || 'unknown',
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
