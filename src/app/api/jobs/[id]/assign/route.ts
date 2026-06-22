
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { SmsService } from '@/lib/sms-service';
import { sendPushNotification } from '@/lib/push-notifications';
import { auth } from "@/auth";

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const session = await auth();
        if (!session?.user?.tenantId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const jobId = parseInt(id);
        const { driverId, currentVersion } = await req.json();

        const job = await prisma.job.findUnique({ where: { id: jobId } });
        if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });
        
        // Tenant Isolation: Job
        if (job.tenantId !== session.user.tenantId) {
            return NextResponse.json({ error: 'Job not found' }, { status: 404 });
        }

        // Validate Job Status
        if (['CANCELLED', 'COMPLETED', 'NO_SHOW'].includes(job.status) || job.paymentStatus === 'REFUNDED') {
            return NextResponse.json({ error: 'Cannot assign cancelled, completed, no-show, or refunded jobs.' }, { status: 400 });
        }

        const expectedVersion = currentVersion || job.version;

        // 1. Validate Driver Status
        const driver = await prisma.driver.findUnique({
            where: { id: driverId },
            include: { vehicles: true }
        });

        if (!driver) {
            return NextResponse.json({ error: 'Driver not found' }, { status: 404 });
        }

        // Tenant Isolation: Driver
        if (driver.tenantId !== session.user.tenantId) {
            return NextResponse.json({ error: 'Driver not found' }, { status: 404 });
        }

        if (driver.status === 'BUSY') {
            return NextResponse.json({ error: 'Driver is currently BUSY' }, { status: 400 });
        }

        if (driver.status === 'OFF_DUTY') {
            return NextResponse.json({ error: 'Driver is currently OFFLINE/OFF_DUTY' }, { status: 400 });
        }

        // 2. Transaction: Update Job + Update Driver Status
        const [updatedJob] = await prisma.$transaction([
            prisma.job.update({
                where: { id: jobId, version: expectedVersion },
                data: {
                    driverId,
                    status: 'DISPATCHED',
                    version: { increment: 1 }
                },
                include: { customer: true }
            }),
            prisma.driver.update({
                where: { id: driverId },
                data: { status: 'BUSY' }
            })
        ]);

        const tenantSettings = await prisma.tenant.findUnique({ where: { id: session.user.tenantId } });

        // Notifications
        // 1. Notify Driver of Job Offer
        SmsService.sendJobOfferToDriver(updatedJob, driver, tenantSettings).catch(e => console.error("Failed to SMS Driver", e));
        
        if (driver.expoPushToken) {
            sendPushNotification({
                to: driver.expoPushToken,
                title: 'New Job Assigned!',
                body: `Pickup at ${updatedJob.pickupAddress}. Open app to Accept or Reject.`,
                data: { route: 'home', jobId: updatedJob.id }
            });
        }

        return NextResponse.json(updatedJob);
    } catch (error: any) {
        if (error.code === 'P2025') {
            return NextResponse.json({ error: 'Job was already modified or taken by someone else' }, { status: 409 });
        }
        console.error("Assign failed", error);
        return NextResponse.json({ error: 'Assignment Failed' }, { status: 500 });
    }
}
