import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import Stripe from 'stripe';

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,OPTIONS,PATCH,DELETE,POST,PUT",
    "Access-Control-Allow-Headers": "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version",
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
        const body = await req.json();

        const tenant = await prisma.tenant.findUnique({
            where: { slug }
        });

        if (!tenant) {
            return NextResponse.json({ error: 'Tenant not found' }, { status: 404, headers: corsHeaders });
        }

        if (!tenant.enableWebBooker) {
            return NextResponse.json({ error: 'Web booking is disabled' }, { status: 403, headers: corsHeaders });
        }

        const {
            pickup,
            dropoff,
            vias,
            pickupTime,
            passengerName,
            passengerPhone,
            passengerEmail,
            vehicleClass,
            scheduledTime,
            requiresWav,
            price,
            distanceMiles,
            notes,
            flightNumber,
            isWaitAndReturn,
            waitingTime,
            paymentType, // 'CARD' or 'CASH'
            expoPushToken // Used to alert the customer when the driver arrives
        } = body;

        if (!pickup || !dropoff || !passengerName || !passengerPhone) {
            return NextResponse.json({ error: 'Missing required configuration' }, { status: 400, headers: corsHeaders });
        }

        // Generate Booking UID
        const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, '');
        const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();

        // 2. Identify or Create Customer
        const customer = await prisma.customer.upsert({
            where: {
                tenantId_phone: {
                    tenantId: tenant.id,
                    phone: passengerPhone,
                }
            },
            update: {
                name: passengerName,
                email: passengerEmail,
                expoPushToken: expoPushToken || undefined
            },
            create: {
                tenantId: tenant.id,
                phone: passengerPhone,
                name: passengerName,
                email: passengerEmail,
                expoPushToken: expoPushToken || undefined
            }
        });

        const job = await prisma.job.create({
            data: {
                tenantId: tenant.id,
                status: 'PENDING',
                pickupAddress: pickup,
                dropoffAddress: dropoff,
                vias: vias || [],
                pickupTime: pickupTime ? new Date(pickupTime) : (scheduledTime ? new Date(scheduledTime) : new Date()),
                scheduledTime: scheduledTime ? new Date(scheduledTime) : undefined,
                passengerName,
                passengerPhone,
                vehicleType: vehicleClass || 'Saloon',
                requiresWav: requiresWav || false,
                fare: parseFloat(price) || 0.0,
                notes: notes || 'Booked via Web/App',
                flightNumber,
                isReturn: isWaitAndReturn || false,
                waitingTime: waitingTime || 0
            }
        });

        let clientSecret = null;
        let publishableKey = tenant.stripePublishableKey;

        // If customer requested to pay by card AND tenant has stripe connected
        if (paymentType === 'CARD' && tenant.stripeSecretKey) {
            const stripe = new Stripe(tenant.stripeSecretKey, {
                apiVersion: '2025-02-24.acacia' as any, // Cast to any to bypass strict version match temporarily
            });

            // Convert fare to smallest currency unit (pence/cents)
            const amount = Math.round((parseFloat(price) || 0) * 100);

            if (amount > 0) {
                const paymentIntent = await stripe.paymentIntents.create({
                    amount,
                    currency: 'gbp',
                    metadata: {
                        bookingId: job.id,
                        tenantId: tenant.id
                    }
                });
                clientSecret = paymentIntent.client_secret;

                // Update booking with the intent ID
                await prisma.job.update({
                    where: { id: job.id },
                    data: {
                        stripePaymentIntentId: paymentIntent.id
                    }
                });
            }
        }

        return NextResponse.json({
            success: true,
            bookingId: job.id,
            clientSecret,
            publishableKey
        }, { headers: corsHeaders });

    } catch (error) {
        console.error('Error creating public booking:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: corsHeaders });
    }
}
