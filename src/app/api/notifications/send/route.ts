
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

        let result;

        if (type === 'CONFIRMATION') {
            result = await EmailService.sendBookingConfirmation(booking);
        } else if (type === 'DRIVER_ASSIGNED' && driverId) {
            const driver = await prisma.driver.findUnique({
                where: { id: driverId },
                include: { vehicles: true }
            });
            if (driver) {
                result = await EmailService.sendDriverAssigned(booking, driver);
            }
        } else if (type === 'JOB_COMPLETED') {
            result = await EmailService.sendJobReceipt(booking);
        }


        return NextResponse.json({ success: true, result });

    } catch (error) {
        console.error("Notification Error", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
