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

        // 1. Validate Tenant & Feature
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
            pickup, dropoff, pickupLat, pickupLng, dropoffLat, dropoffLng, vias, distanceMiles,
            pickupTime, vehicleType, passengerName, passengerPhone, passengers,
            luggage, notes, isWaitAndReturn, waitingTime, flightNumber
        } = body;

        if (!pickup || !dropoff || !pickupTime || !passengerName || !passengerPhone) {
            return NextResponse.json({ error: 'Missing required booking fields' }, { status: 400 });
        }

        // 2. Fetch/Create Customer Profile by Phone
        let customer = await prisma.customer.findFirst({
            where: { phone: passengerPhone, tenantId: tenant.id }
        });

        if (!customer) {
            customer = await prisma.customer.create({
                data: {
                    phone: passengerPhone,
                    name: passengerName,
                    tenantId: tenant.id
                }
            });
        }

        // 3. Re-calculate price server-side to prevent client tampering
        const pricingResult = await calculatePrice({
            pickup, dropoff, vias, distanceMiles,
            pickupTime: new Date(pickupTime),
            vehicleType,
            companyId: tenant.id,
            isWaitAndReturn,
            waitingTime,
            pickupLat, pickupLng, dropoffLat, dropoffLng
        });

        // 4. Create Job on Dispatch Board
        const job = await prisma.job.create({
            data: {
                tenantId: tenant.id,
                customerId: customer.id,
                pickupAddress: pickup,
                dropoffAddress: dropoff,
                pickupLat, pickupLng, dropoffLat, dropoffLng,
                vias: vias ? JSON.parse(JSON.stringify(vias)) : null,
                pickupTime: new Date(pickupTime),
                passengerName,
                passengerPhone,
                passengers: parseInt(passengers || '1'),
                luggage: parseInt(luggage || '0'),
                vehicleType: vehicleType || 'Saloon',
                flightNumber,
                notes,
                isReturn: false,
                waitingTime: waitingTime || 0,

                // Financials (Defaulting Cash/Pay In Car for MVP)
                fare: pricingResult.price,
                isFixedPrice: pricingResult.breakdown.isFixed,
                paymentType: 'CASH',
                paymentStatus: 'UNPAID',

                // Dispatch setup
                status: 'PENDING',
                autoDispatch: tenant.autoDispatch // inherit tenant's auto-dispatch setting
            }
        });

        // 5. If it's a "Wait and Return" job, create the linked Return job seamlessly
        if (isWaitAndReturn) {
            const returnTime = new Date(new Date(pickupTime).getTime() + (waitingTime * 60000));
            await prisma.job.create({
                data: {
                    tenantId: tenant.id,
                    customerId: customer.id,
                    parentJobId: job.id, // Link to original

                    // Flipped Route
                    pickupAddress: dropoff,
                    dropoffAddress: pickup,
                    pickupLat: dropoffLat,
                    pickupLng: dropoffLng,
                    dropoffLat: pickupLat,
                    dropoffLng: pickupLng,

                    pickupTime: returnTime,
                    passengerName,
                    passengerPhone,
                    passengers: parseInt(passengers || '1'),
                    luggage: parseInt(luggage || '0'),
                    vehicleType: vehicleType || 'Saloon',
                    isReturn: true,

                    // Original job holds the fare mapping for the round trip
                    fare: 0,
                    paymentType: 'CASH',
                    status: 'PENDING',
                    autoDispatch: tenant.autoDispatch
                }
            });
        }

        // Return secure response (no sensitive tenant tokens)
        return NextResponse.json({
            success: true,
            jobId: job.id,
            fare: pricingResult.price,
            message: 'Booking received successfully'
        });

    } catch (error) {
        console.error('Error creating public booking:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
