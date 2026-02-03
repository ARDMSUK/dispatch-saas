import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getDriverSession } from '@/lib/driver-auth';

export async function GET(req: Request) {
    try {
        const driver = await getDriverSession(req);
        if (!driver) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const jobs = await prisma.job.findMany({
            where: {
                driverId: driver.driverId,
                status: {
                    in: ['ASSIGNED', 'DISPATCHED', 'EN_ROUTE', 'POB'] // Active statuses
                }
            },
            include: {
                customer: {
                    select: { name: true, phone: true }
                }
            },
            orderBy: {
                pickupTime: 'asc'
            }
        });

        // Also fetch upcoming PENDING jobs if assigned (Pre-assigned)
        // Or if status is specifically ASSIGNED
        // We might want to show COMPLETED jobs for today as history? 
        // For MVP let's send active jobs.

        return NextResponse.json(jobs);

    } catch (error) {
        console.error("Driver Jobs Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
