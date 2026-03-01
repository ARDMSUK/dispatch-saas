import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { calculatePrice } from '@/lib/pricing';

export async function POST(
    req: Request,
    { params }: { params: { slug: string } }
) {
    try {
        const { slug } = params;
        const body = await req.json();

        // 1. Find the Tenant by Slug and ensure WebBooker is enabled
        const tenant = await prisma.tenant.findUnique({
            where: { slug }
        });

        if (!tenant) {
            return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
        }

        if (!tenant.enableWebBooker) {
            return NextResponse.json({ error: 'Web booking is not enabled for this tenant' }, { status: 403 });
        }

        const {
            pickup,
            dropoff,
            vias,
            distanceMiles,
            pickupTime,
            vehicleType,
            isWaitAndReturn,
            waitingTime,
            pickupLat,
            pickupLng,
            dropoffLat,
            dropoffLng
        } = body;

        if (!pickup || !dropoff || !pickupTime) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // 2. Pass details to the shared Pricing Engine with the discovered Tenant ID
        const result = await calculatePrice({
            pickup,
            dropoff,
            vias,
            distanceMiles,
            pickupTime: new Date(pickupTime),
            vehicleType,
            companyId: tenant.id, // Auth-less injection
            isWaitAndReturn,
            waitingTime,
            pickupLat,
            pickupLng,
            dropoffLat,
            dropoffLng
        });

        return NextResponse.json(result);

    } catch (error) {
        console.error('Error calculating public quote:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
