import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const bookingId = (await params).id;

        if (!bookingId) {
            return NextResponse.json({ error: 'Booking ID required' }, { status: 400 });
        }

        // Parse ID to Int (Schema uses Int for Job ID)
        const idAsInt = parseInt(bookingId);
        if (isNaN(idAsInt)) {
            return NextResponse.json({ error: 'Invalid Booking ID' }, { status: 400 });
        }

        // Fetch the job with relation data
        const job = await prisma.job.findUnique({
            where: { id: idAsInt },
            include: {
                driver: {
                    select: {
                        id: true,
                        name: true,  // Driver has 'name' not firstName/lastName in schema!
                        callsign: true, // Lowercase 'callsign' in schema!
                        phone: true,
                        location: true,
                        vehicles: true, // Plural relation
                    }
                },
                customer: true, // Include customer for good measure
            }
        });

        if (!job) {
            return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
        }

        // Helper to parse location safely
        const parseLocation = (loc: string | null) => {
            if (!loc) return null;
            try { return JSON.parse(loc); } catch { return null; }
        };

        // Driver vehicle (take first one)
        const driverVehicle = job.driver?.vehicles?.[0];

        // Sanitize Response (Public API!)
        const publicData = {
            id: job.id,
            status: job.status,
            pickup: job.pickupAddress,   // Schema says pickupAddress
            dropoff: job.dropoffAddress, // Schema says dropoffAddress
            pickupDate: job.pickupTime,  // Schema says pickupTime
            passengers: job.passengers,
            luggage: job.luggage,
            flightNumber: job.flightNumber,
            // Driver details (only if assigned)
            driver: job.driver ? {
                name: job.driver.name,
                callSign: job.driver.callsign, // Schema: callsign
                phone: job.driver.phone,
                location: parseLocation(job.driver.location),
                vehicle: driverVehicle ? {
                    make: driverVehicle.make,
                    model: driverVehicle.model,
                    color: driverVehicle.color,
                    registration: driverVehicle.reg // Schema: reg
                } : null
            } : null,
            // Pricing
            fare: job.fare,
        };

        return NextResponse.json(publicData);

    } catch (error) {
        console.error('Error fetching booking:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
