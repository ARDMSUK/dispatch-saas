
import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { amount, currency = 'gbp', bookingId } = body;

        // Create PaymentIntent
        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(amount * 100), // Convert to cents/pence
            currency,
            automatic_payment_methods: { enabled: true },
            metadata: { bookingId: bookingId?.toString() }
        });

        // If bookingId exists, update the record
        if (bookingId) {
            await prisma.job.update({
                where: { id: parseInt(bookingId) },
                data: {
                    stripePaymentIntentId: paymentIntent.id,
                    stripeClientSecret: paymentIntent.client_secret,
                    paymentType: 'CARD' // Ensure it's marked as Card
                }
            });
        }

        return NextResponse.json({
            clientSecret: paymentIntent.client_secret,
            paymentIntentId: paymentIntent.id
        });

    } catch (error) {
        console.error("Stripe Error:", error);
        return NextResponse.json({ error: "Payment init failed" }, { status: 500 });
    }
}
