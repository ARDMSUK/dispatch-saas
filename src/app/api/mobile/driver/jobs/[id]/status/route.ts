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
        "UNASSIGNED"
    ])
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

        const body = await request.json();
        const validation = UpdateJobSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json({ error: 'Invalid data', details: validation.error }, { status: 400, headers: corsHeaders });
        }

        const { status } = validation.data;
        const { id } = await params;
        const jobId = parseInt(id);

        if (isNaN(jobId)) {
            return NextResponse.json({ error: 'Invalid Job ID' }, { status: 400, headers: corsHeaders });
        }

        // Verify that this job actually belongs to this driver
        const existingJob = await prisma.job.findUnique({
            where: { id: jobId }
        });

        if (!existingJob || existingJob.driverId !== driverId) {
            return NextResponse.json({ error: 'Forbidden or Job not found' }, { status: 403, headers: corsHeaders });
        }

        const realStatus = status === 'CLEARED' ? 'COMPLETED' : status;

        let updatedJob;

        if (realStatus === 'COMPLETED' || realStatus === 'CANCELLED' || realStatus === 'NO_SHOW') {
            const [job, driver] = await prisma.$transaction([
                prisma.job.update({
                    where: { id: jobId },
                    data: { status: realStatus },
                    include: {
                        driver: {
                            include: { vehicles: true }
                        },
                        customer: true
                    }
                }),
                prisma.driver.update({
                    where: { id: driverId as string },
                    data: { status: 'ONLINE' }
                })
            ]);
            updatedJob = job;
        } else if (realStatus === 'UNASSIGNED') {
            const [job, driver] = await prisma.$transaction([
                prisma.job.update({
                    where: { id: jobId },
                    data: { status: 'UNASSIGNED', driverId: null },
                    include: {
                        driver: {
                            include: { vehicles: true }
                        },
                        customer: true
                    }
                }),
                prisma.driver.update({
                    where: { id: driverId as string },
                    data: { status: 'ONLINE' }
                })
            ]);
            updatedJob = job;
        } else {
            updatedJob = await prisma.job.update({
                where: { id: jobId },
                data: { status: realStatus },
                include: {
                    driver: {
                        include: { vehicles: true }
                    },
                    customer: true
                }
            });
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
