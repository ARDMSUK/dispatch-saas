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

        // Automatically free the driver if the job is finished
        let driverUpdateData: any = {};

        if (['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(status)) {
            driverUpdateData.status = 'FREE';
        }

        // If location provided, we could update driver location too
        if (lat && lng) {
            driverUpdateData.location = JSON.stringify({ lat, lng });
        }

        if (Object.keys(driverUpdateData).length > 0) {
            await prisma.driver.update({
                where: { id: driver.driverId },
                data: driverUpdateData
            });
        }

        // Send Notifications based on new status
        try {
            // Need full job info with customer and driver for templates
            const fullJob = await prisma.job.findUnique({
                where: { id: jobId },
                include: { customer: true }
            });

            const fullDriver = await prisma.driver.findUnique({
                where: { id: driver.driverId },
                include: { vehicles: true }
            });

            const tenantSettings = await prisma.tenant.findUnique({
                where: { id: job.tenantId }
            });

            if (fullJob && fullDriver) {
                const { EmailService } = await import('@/lib/email-service');
                const { SmsService } = await import('@/lib/sms-service');

                if (status === 'EN_ROUTE') {
                    // Driver Accepted Job
                    await EmailService.sendDriverAssigned(fullJob, fullDriver, tenantSettings);
                    await SmsService.sendDriverAssigned(fullJob, fullDriver, tenantSettings);
                } else if (status === 'ARRIVED') {
                    // Driver Arrived
                    await EmailService.sendDriverArrived(fullJob, fullDriver, tenantSettings);
                    await SmsService.sendDriverArrived(fullJob, fullDriver, tenantSettings);
                }
            }
        } catch (notifErr) {
            console.error("Failed to send status update notifications:", notifErr);
            // Don't fail the request if notifications fail
        }

        return NextResponse.json(updatedJob);

    } catch (error) {
        console.error("Update Job Status Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
