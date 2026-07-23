import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyMobileToken } from '@/lib/mobile-auth';
import { EmailService } from '@/lib/email-service';
import { SmsService } from '@/lib/sms-service';
import { sendPushNotification } from '@/lib/push-notifications';
import { z } from 'zod';

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,OPTIONS,PATCH,DELETE,POST,PUT",
    "Access-Control-Allow-Headers": "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization",
};

export async function OPTIONS() {
    return new Response(null, { status: 204, headers: corsHeaders });
}

const UpdateJobSchema = z.object({
    status: z.enum([
        "EN_ROUTE",
        "ARRIVED",
        "POB",
        "CLEARED",
        "UNASSIGNED",
        "NO_SHOW"
    ]),
    completeUnpaid: z.boolean().optional()
});

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const authHeader = request.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
        }

        const token = authHeader.split(' ')[1];
        const payload = await verifyMobileToken(token);

        if (!payload || (!payload.id && !payload.driverId)) {
            return NextResponse.json({ error: 'Invalid token' }, { status: 401, headers: corsHeaders });
        }

        const driverId = payload.driverId || payload.id;

        const driver = await prisma.driver.findUnique({
            where: { id: driverId as string }
        });

        if (!driver) {
            return NextResponse.json({ error: 'Driver not found' }, { status: 404, headers: corsHeaders });
        }

        const body = await request.json();
        const validation = UpdateJobSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json({ error: 'Invalid data', details: validation.error }, { status: 400, headers: corsHeaders });
        }

        const { status, completeUnpaid } = validation.data;
        const { id } = await params;
        const jobId = parseInt(id);

        if (isNaN(jobId)) {
            return NextResponse.json({ error: 'Invalid Job ID' }, { status: 400, headers: corsHeaders });
        }

        // Verify that this job actually belongs to this driver
        const existingJob = await prisma.job.findFirst({ where: { id: jobId, driverId: driver.id, tenantId: driver.tenantId } });

        if (!existingJob || existingJob.driverId !== driverId) {
            return NextResponse.json({ error: 'Forbidden or Job not found' }, { status: 403, headers: corsHeaders });
        }

        // Explicit tenant isolation
        if (existingJob.tenantId !== driver.tenantId) {
            return NextResponse.json({ error: 'Forbidden (tenant mismatch)' }, { status: 403, headers: corsHeaders });
        }

        // Block invalid job states
        const blockedStates = ['CANCELLED', 'COMPLETED', 'NO_SHOW', 'REFUNDED'];
        if (blockedStates.includes(existingJob.status) || existingJob.paymentStatus === 'REFUNDED') {
            return NextResponse.json({ error: 'Cannot update job in this state' }, { status: 400, headers: corsHeaders });
        }

        const realStatus = status === 'CLEARED' ? 'COMPLETED' : status;

        // Block nonsensical transitions
        const validTransitions: Record<string, string[]> = {
            'PENDING': ['UNASSIGNED'], 
            'DISPATCHED': ['EN_ROUTE', 'UNASSIGNED'],
            'EN_ROUTE': ['ARRIVED', 'UNASSIGNED'],
            'ARRIVED': ['POB', 'NO_SHOW', 'UNASSIGNED'],
            'POB': ['COMPLETED', 'UNASSIGNED']
        };

        if (validTransitions[existingJob.status] && !validTransitions[existingJob.status].includes(realStatus)) {
            return NextResponse.json({ error: `Invalid transition from ${existingJob.status} to ${realStatus}` }, { status: 400, headers: corsHeaders });
        }

        if (realStatus === 'COMPLETED' && existingJob.paymentStatus === 'UNPAID') {
            if (status !== 'CLEARED') {
                if (existingJob.paymentType === 'CASH') {
                    return NextResponse.json({ error: 'CASH jobs require payment collection before completion' }, { status: 400, headers: corsHeaders });
                } else if (!completeUnpaid) {
                    return NextResponse.json({ error: 'Explicit office authorisation required to complete unpaid jobs' }, { status: 400, headers: corsHeaders });
                }
            }
        }

        let updatedJob;

        try {
            updatedJob = await prisma.$transaction(async (tx) => {
                if (realStatus === 'COMPLETED' || (realStatus as string) === 'CANCELLED' || realStatus === 'NO_SHOW') {
                    const isCashPayment = existingJob.paymentType === 'CASH';
                    const updateData: any = { status: realStatus };

                    // For CASH jobs, the current mobile app sends CLEARED after the driver completes
                    // the Cash Collected flow. Therefore the backend treats CLEARED/COMPLETED for
                    // CASH jobs as payment collected and marks paymentStatus PAID.
                    //
                    // Future improvement: Driver app should send explicit cashCollected/paymentCollected
                    // boolean so the backend does not rely on this UI-flow assumption.
                    if (realStatus === 'COMPLETED' && isCashPayment) {
                        updateData.paymentStatus = 'PAID';
                    }

                    const jobUpdate = await tx.job.updateMany({
                        where: { id: jobId, driverId: driver.id, tenantId: driver.tenantId },
                        data: updateData
                    });
                    if (jobUpdate.count !== 1) throw new Error("Failed to update job");

                    const driverUpdate = await tx.driver.updateMany({
                        where: { id: driver.id, tenantId: driver.tenantId },
                        data: { status: 'FREE' }
                    });
                    if (driverUpdate.count !== 1) throw new Error("Failed to release driver");

                } else if (realStatus === 'UNASSIGNED') {
                    const jobUpdate = await tx.job.updateMany({
                        where: { id: jobId, driverId: driver.id, tenantId: driver.tenantId },
                        data: { status: 'PENDING', driverId: null }
                    });
                    if (jobUpdate.count !== 1) throw new Error("Failed to unassign job");

                    const driverUpdate = await tx.driver.updateMany({
                        where: { id: driver.id, tenantId: driver.tenantId },
                        data: { status: 'FREE' }
                    });
                    if (driverUpdate.count !== 1) throw new Error("Failed to release driver");

                } else {
                    const jobUpdate = await tx.job.updateMany({
                        where: { id: jobId, driverId: driver.id, tenantId: driver.tenantId },
                        data: { status: realStatus }
                    });
                    if (jobUpdate.count !== 1) throw new Error("Failed to update job");
                }

                const job = await tx.job.findFirst({
                    where: { id: jobId, driverId: realStatus === 'UNASSIGNED' ? null : driver.id, tenantId: driver.tenantId },
                    include: {
                        driver: { include: { vehicles: true } },
                        customer: true
                    }
                });

                if (!job) throw new Error("Job not found after update");
                return job;
            });
        } catch (e: any) {
            return NextResponse.json({ error: e.message || "Transaction failed" }, { status: 500, headers: corsHeaders });
        }

        // Fetch Tenant Settings to apply custom templates
        const tenantSettings = await prisma.tenant.findUnique({ where: { id: updatedJob.tenantId } });

        // --- Notifications ---
        // Driver Accepted / En Route
        if (realStatus === 'EN_ROUTE' && updatedJob.driverId && updatedJob.driver) {
            console.log(`[Mobile API] Job ${jobId} En Route. Sending Notification to Passenger...`);
            EmailService.sendDriverAssigned(updatedJob, updatedJob.driver, tenantSettings).catch(e => console.error(e));
            SmsService.sendDriverAssigned(updatedJob, updatedJob.driver, tenantSettings).catch(e => console.error(e));

            if (updatedJob.customer?.expoPushToken) {
                sendPushNotification({
                    to: updatedJob.customer.expoPushToken,
                    title: 'Your driver is on the way!',
                    body: `${updatedJob.driver.name} is heading to your pickup location.`,
                    data: { route: 'tracking', id: jobId }
                });
            }
        }

        // Driver Arrived
        if (realStatus === 'ARRIVED' && updatedJob.driverId && updatedJob.driver) {
            console.log(`[Mobile API] Job ${jobId} Arrived. Sending Notification...`);
            EmailService.sendDriverArrived(updatedJob, updatedJob.driver, tenantSettings).catch(e => console.error(e));
            // Notify Passenger
            SmsService.sendDriverArrived(updatedJob, updatedJob.driver, tenantSettings).catch(e => console.error(e));

            if (updatedJob.customer?.expoPushToken) {
                sendPushNotification({
                    to: updatedJob.customer.expoPushToken,
                    title: 'Driver Arrived',
                    body: 'Your driver is outside waiting for you.',
                    data: { route: 'tracking', id: jobId }
                });
            }
        }

        // Job Completed (Receipt)
        if (realStatus === 'COMPLETED') {
            console.log(`[Mobile API] Job ${jobId} Completed. Sending Receipt...`);
            EmailService.sendJobReceipt(updatedJob, tenantSettings).catch(e => console.error(e));
        }
        // ---------------------

        return NextResponse.json(updatedJob, { headers: corsHeaders });
    } catch (error) {
        console.error('Error updating job status from mobile:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500, headers: corsHeaders });
    }
}
