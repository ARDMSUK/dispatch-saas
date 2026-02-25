import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getDriverSession } from '@/lib/driver-auth';

export async function GET(req: Request) {
    try {
        const driver = await getDriverSession(req);
        if (!driver) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const type = searchParams.get('type'); // 'active' (default) or 'history'

        const statusFilter = type === 'history'
            ? { in: ['COMPLETED', 'CANCELLED', 'NO_SHOW'] }
            : { in: ['ASSIGNED', 'DISPATCHED', 'EN_ROUTE', 'ARRIVED', 'POB'] };

        const jobs = await prisma.job.findMany({
            where: {
                OR: [
                    // Case 1: Active assignments (DISPATCHED, etc)
                    {
                        driverId: driver.driverId,
                        status: statusFilter
                    },
                    // Case 2: Pre-assigned future bookings (even if PENDING)
                    // Only include if we are looking for 'active' (future) jobs, not history
                    ...(type !== 'history' ? [{
                        preAssignedDriverId: driver.driverId,
                        status: { in: ['PENDING', 'UNASSIGNED'] } // Pre-assigned usually sit here until dispatch
                    }] : [])
                ]
            },
            include: {
                customer: true,
                driver: true
            },
            orderBy: {
                pickupTime: type === 'history' ? 'desc' : 'asc'
            }
        });

        const mappedJobs = jobs.map(j => ({
            id: j.id,
            pickupAddress: j.pickupAddress,
            dropoffAddress: j.dropoffAddress,
            passengerName: j.passengerName || j.customer?.name || "Unknown",
            passengerPhone: j.passengerPhone || j.customer?.phone || "Unknown",
            pickupTime: j.pickupTime.toISOString(),
            fare: j.fare,
            status: j.status,
            paymentType: j.paymentType,
            passengers: j.passengers,
            luggage: j.luggage,
            notes: j.notes,
            vehicleType: j.vehicleType,
            flightNumber: j.flightNumber,
            isReturn: j.isReturn
        }));

        return NextResponse.json(mappedJobs);

    } catch (error) {
        console.error("Driver Jobs Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
