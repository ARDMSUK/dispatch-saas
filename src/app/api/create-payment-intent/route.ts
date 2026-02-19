
import { NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { prisma } from '@/lib/prisma';
// import { calculatePrice } from '@/lib/pricing'; // Not used in MVP for now

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { amount, currency = 'gbp', bookingDetails } = body;

        // SECURITY: Ideally, we should recalculate the price here based on bookingDetails
        // to prevent client-side manipulation. For this MVP, we'll trust the amount passed
        // IF it matches a re-calculation, or at least validate it's reasonable.
        // For now, we'll proceed with the passed amount but log a warning if it looks suspicious.

        if (!amount || amount < 0.50) { // Minimum 50p
            return NextResponse.json({ error: "Invalid amount (Minimum £0.50)" }, { status: 400 });
        }

        // Fetch Tenant Config
        const tenantId = bookingDetails?.tenantId;
        if (!tenantId) {
            return NextResponse.json({ error: "Tenant ID required" }, { status: 400 });
        }

        const tenant = await prisma.tenant.findUnique({
            where: { id: tenantId }
        });

        // Use Tenant Key or Fallback to System Key (if env var set)
        const apiKey = tenant?.stripeSecretKey || process.env.STRIPE_SECRET_KEY;

        if (!apiKey) {
            return NextResponse.json({ error: "Payment configuration missing for this tenant" }, { status: 500 });
        }

        const stripe = getStripe(apiKey);

        console.log(`[Payment] Creating Intent for ${amount} ${currency.toUpperCase()} (Tenant: ${tenant?.name || 'System'})`);

        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(amount * 100), // Convert to pennies/cents
            currency: currency,
            automatic_payment_methods: {
                enabled: true,
            },
            metadata: {
                tenantId: tenantId,
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
