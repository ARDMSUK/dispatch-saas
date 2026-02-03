import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getDriverSession } from '@/lib/driver-auth';

// Define params type for Next.js dynamic route
// Props to route handers in App Router are (req, { params })
export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> } // Params are now a Promise in Next 15/latest
) {
    try {
        const driver = await getDriverSession(req);
        if (!driver) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const jobId = parseInt(id);
        if (isNaN(jobId)) {
            return NextResponse.json({ error: "Invalid Job ID" }, { status: 400 });
        }

        const body = await req.json();
        const { status, lat, lng } = body;

        // Verify Job Ownership
        const job = await prisma.job.findUnique({
            where: { id: jobId }
        });

        if (!job) {
            return NextResponse.json({ error: "Job not found" }, { status: 404 });
        }

        if (job.driverId !== driver.driverId) {
            return NextResponse.json({ error: "Not assigned to this job" }, { status: 403 });
        }

        // Update Job
        const updatedJob = await prisma.job.update({
            where: { id: jobId },
            data: { status }
        });

        // If location provided, we could update driver location too
        if (lat && lng) {
            await prisma.driver.update({
                where: { id: driver.driverId },
                data: { location: JSON.stringify({ lat, lng }) }
            });
        }

        // Send Notification if status is completed?
        // We already have a notification trigger in handleStatusUpdate in frontend, 
        // but here it is backend. Ideally we should trigger notifications here too.
        // For now, MVP just updates DB.

        return NextResponse.json(updatedJob);

    } catch (error) {
        console.error("Update Job Status Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
