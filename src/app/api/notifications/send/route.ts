
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { EmailService } from '@/lib/email-service';

export async function POST(req: Request) {
    try {
        const session = await auth();
        if (!session?.user?.tenantId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { type, bookingId, driverId } = body;
        const bookingIdInt = parseInt(bookingId);

        if (isNaN(bookingIdInt)) {
            return NextResponse.json({ error: "Invalid Booking ID" }, { status: 400 });
        }

        const booking = await prisma.job.findUnique({
            where: { id: bookingIdInt },
            include: { customer: true }
        });

        if (!booking) {
            return NextResponse.json({ error: "Booking not found" }, { status: 404 });
        }

        const tenantSettings = await prisma.tenant.findUnique({ where: { id: session.user.tenantId } });
        let result;

        if (type === 'CONFIRMATION') {
            console.log(`[Notification] Sending CONFIRMATION for Booking #${bookingIdInt}`);
            result = await EmailService.sendBookingConfirmation(booking, tenantSettings);
        } else if (type === 'DRIVER_ASSIGNED' && driverId) {
            const driver = await prisma.driver.findUnique({
                where: { id: driverId },
                include: { vehicles: true }
            });
            if (driver) {
                console.log(`[Notification] Sending DRIVER_ASSIGNED for Booking #${bookingIdInt} to Driver ${driver.callsign}`);
                result = await EmailService.sendDriverAssigned(booking, driver, tenantSettings);
            } else {
                console.error(`[Notification] Driver ${driverId} not found`);
                return NextResponse.json({ error: "Driver not found" }, { status: 404 });
            }
        } else if (type === 'JOB_COMPLETED') {
            console.log(`[Notification] Sending JOB_COMPLETED for Booking #${bookingIdInt}`);
            result = await EmailService.sendJobReceipt(booking, tenantSettings);
        }

        if (result && !result.success) {
            console.error(`[Notification] Service Error:`, result.error);
        }


        return NextResponse.json({ success: true, result });

    } catch (error) {
        console.error("Notification Error", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
