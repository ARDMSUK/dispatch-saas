
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { SmsService } from '@/lib/sms-service';
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
        const { driverId } = await req.json();

        // 1. Validate Driver Status
        const driver = await prisma.driver.findUnique({
            where: { id: driverId },
            include: { vehicles: true }
        });

        if (!driver) {
            return NextResponse.json({ error: 'Driver not found' }, { status: 404 });
        }

        if (driver.status === 'BUSY') {
            return NextResponse.json({ error: 'Driver is currently BUSY' }, { status: 400 });
        }

        // 2. Transaction: Update Job + Update Driver Status
        const [updatedJob] = await prisma.$transaction([
            prisma.job.update({
                where: { id: jobId },
                data: {
                    driverId,
                    status: 'DISPATCHED'
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
        // 1. Notify Driver
        SmsService.sendJobOfferToDriver(updatedJob, driver, tenantSettings).catch(e => console.error("Failed to SMS Driver", e));

        // 2. Notify Passenger (Driver Assigned)
        if (updatedJob.passengerPhone) {
            SmsService.sendDriverAssigned(updatedJob, driver, tenantSettings).catch(e => console.error("Failed to SMS Passenger", e));
        }

        return NextResponse.json(updatedJob);
    } catch (error) {
        console.error("Assign failed", error);
        return NextResponse.json({ error: 'Assignment Failed' }, { status: 500 });
    }
}
