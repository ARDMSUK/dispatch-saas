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
        const { status, lat, lng, paymentType } = body;

        // Verify Job Ownership
        const existingJob = await prisma.job.findFirst({ where: { id: jobId, driverId: driver.driverId, tenantId: driver.tenantId } });

        if (!existingJob) {
            return NextResponse.json({ error: "Job not found" }, { status: 404 });
        }

        if (existingJob.driverId !== driver.driverId) {
            return NextResponse.json({ error: "Not assigned to this job" }, { status: 403 });
        }

        // Update Job
        const updateData: any = { status };

        const effectivePaymentType = paymentType || existingJob.paymentType;

        if (status === 'COMPLETED') {
            if (paymentType) {
                updateData.paymentType = paymentType;
            }

            // For CASH jobs, the current driver app completion flow requires the driver 
            // to press Cash Collected before sending COMPLETED, so the backend treats 
            // completed CASH jobs as PAID.
            // 
            // Future improvement: Add explicit cashCollected/paymentCollected boolean 
            // from the driver app so backend does not rely on this UI-flow assumption.
            if (effectivePaymentType === 'CASH') {
                updateData.paymentStatus = 'PAID';
            }
        }

        let updatedJob;
        
        try {
            updatedJob = await prisma.$transaction(async (tx) => {
                const jobUpdate = await tx.job.updateMany({
                    where: { id: jobId, driverId: driver.driverId, tenantId: driver.tenantId },
                    data: updateData
                });

                if (jobUpdate.count !== 1) throw new Error("Failed to update job");

                // Automatically free the driver if the job is finished
                const driverUpdateData: any = {};

                if (['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(status)) {
                    driverUpdateData.status = 'FREE';
                }

                // If location provided, we could update driver location too
                if (lat && lng) {
                    driverUpdateData.location = JSON.stringify({ lat, lng });
                }

                if (Object.keys(driverUpdateData).length > 0) {
                    const driverUpdate = await tx.driver.updateMany({
                        where: { id: driver.driverId, tenantId: driver.tenantId },
                        data: driverUpdateData
                    });
                    if (driverUpdate.count !== 1) throw new Error("Failed to release driver");
                }

                const fetchedJob = await tx.job.findFirst({ where: { id: jobId, tenantId: driver.tenantId } });
                if (!fetchedJob) throw new Error("Job not found after update");
                return fetchedJob;
            });
        } catch (e: any) {
            return NextResponse.json({ error: e.message || "Failed to update job status" }, { status: 500 });
        }

        // Send Notifications based on new status
        try {
            // Need full job info with customer and driver for templates
            const fullJob = await prisma.job.findFirst({
                where: { id: jobId, tenantId: driver.tenantId },
                include: { customer: true }
            });

            const fullDriver = await prisma.driver.findFirst({
                where: { id: driver.driverId, tenantId: driver.tenantId },
                include: { vehicles: true }
            });

            const tenantSettings = await prisma.tenant.findUnique({
                where: { id: driver.tenantId }
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
