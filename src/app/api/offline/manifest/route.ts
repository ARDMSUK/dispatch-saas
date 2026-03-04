import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from "@/auth";

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    try {
        const session = await auth();
        if (!session?.user?.tenantId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get jobs from today - 1 day to today + 2 days
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        start.setDate(start.getDate() - 1);

        const end = new Date();
        end.setHours(23, 59, 59, 999);
        end.setDate(end.getDate() + 2);

        const jobs = await prisma.job.findMany({
            where: {
                tenantId: session.user.tenantId,
                pickupTime: {
                    gte: start,
                    lte: end
                }
            },
            include: {
                driver: true,
                customer: true
            },
            orderBy: { pickupTime: 'asc' }
        });

        // Strip down to absolute bare minimum fields to save storage space
        const lightJobs = jobs.map(j => ({
            id: j.id,
            pickup: j.pickupAddress,
            dropoff: j.dropoffAddress,
            time: j.pickupTime.toISOString(),
            status: j.status,
            name: j.passengerName || "Unknown",
            phone: j.passengerPhone || "",
            driver: j.driver ? j.driver.name : "Unassigned"
        }));

        return NextResponse.json(lightJobs);
    } catch (e) {
        return NextResponse.json({ error: 'Failed to fetch manifest' }, { status: 500 });
    }
}
