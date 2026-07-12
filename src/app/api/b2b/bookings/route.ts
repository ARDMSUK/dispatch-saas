import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { BookingSchema } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const session = await auth();

        // Must be B2B Admin with a linked account
        if (!session?.user?.tenantId || session.user.role !== 'B2B_ADMIN' || !(session.user as any).accountId) {
            return NextResponse.json({ error: 'Unauthorized B2B Access' }, { status: 401 });
        }

        const tenantId = session.user.tenantId;
        const accountId = (session.user as any).accountId;

        // Fetch bookings for this exact account
        const bookings = await prisma.job.findMany({
            where: {
                tenantId,
                accountId,
                // Do not fetch fully completed jobs here, they go to the ledger
                status: {
                    notIn: ['COMPLETED', 'CANCELLED']
                }
            },
            orderBy: {
                pickupTime: 'asc'
            }
        });

        // Use custom serialization to handle BigInt if necessary (Job id is Int but just in case)
        return new NextResponse(JSON.stringify(bookings, (_, v) => typeof v === 'bigint' ? v.toString() : v), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('Failed to fetch B2B bookings', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const session = await auth();

        if (!session?.user?.tenantId || session.user.role !== 'B2B_ADMIN' || !(session.user as any).accountId) {
            return NextResponse.json({ error: 'Unauthorized B2B Access' }, { status: 401 });
        }

        const tenantId = session.user.tenantId;
        const accountId = (session.user as any).accountId;

        const tenant = await prisma.tenant.findUnique({
            where: { id: tenantId },
            select: { subscriptionStatus: true }
        });

        if (tenant && (tenant.subscriptionStatus === 'PAST_DUE' || tenant.subscriptionStatus === 'CANCELED')) {
            return NextResponse.json({ error: 'Corporate bookings are temporarily suspended due to a platform billing issue.' }, { status: 403 });
        }

        const body = await req.json();
        const validation = BookingSchema.omit({ tenantId: true }).safeParse(body);

        if (!validation.success) {
            return NextResponse.json({ error: 'Invalid data', details: validation.error }, { status: 400 });
        }

        const data = validation.data;

        // 1. Resolve coordinates (mocked for speed, normally you'd call Google Maps here)
        // In a real scenario you'd geocode `pickupAddress` and `dropoffAddress`
        const pickupLat = 51.5074;
        const pickupLng = -0.1278;
        const dropoffLat = 51.5200;
        const dropoffLng = -0.1500;

        // 2. Fetch Account for customer reference
        const account = await prisma.account.findFirst({
            where: {
                id: (session.user as any).accountId,
                tenantId: session.user.tenantId
            }
        });

        if (!account) {
            return NextResponse.json({ error: 'Account not found or access denied' }, { status: 404 });
        }

        const customer = await prisma.customer.upsert({
            where: {
                tenantId_phone: {
                    tenantId,
                    phone: data.passengerPhone
                }
            },
            update: {
                name: data.passengerName || "Corporate Staff",
                // Ensure it's permanently linked to the account if they book again
                isAccount: true,
                accountId: account.id
            },
            create: {
                tenantId,
                phone: data.passengerPhone,
                name: data.passengerName || "Corporate Staff",
                isAccount: true,
                accountId: account.id
            }
        });
        const customerId = customer.id;

        // 3. Create the Job
        const newBooking = await prisma.job.create({
            data: {
                pickupAddress: data.pickupAddress,
                dropoffAddress: data.dropoffAddress,
                pickupLat,
                pickupLng,
                dropoffLat,
                dropoffLng,
                pickupTime: data.pickupTime ? new Date(data.pickupTime) : new Date(),
                passengerName: data.passengerName,
                passengerPhone: data.passengerPhone,
                passengers: data.passengers,
                status: 'PENDING',
                vehicleType: "Saloon", // Defaulting for simple B2B workflow
                notes: data.notes || "Booked via Corporate Portal",
                paymentType: "ACCOUNT",
                paymentStatus: "UNPAID",
                tenantId,
                accountId: account.id,
                customerId,
                // Default Pricing info (could be calculated via pricing engine)
                isFixedPrice: false,
                fare: 0,
                waitingTime: 0,
                waitingCost: 0
            }
        });

        return new NextResponse(JSON.stringify(newBooking, (_, v) => typeof v === 'bigint' ? v.toString() : v), {
            status: 201, headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Failed to create B2B booking:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
