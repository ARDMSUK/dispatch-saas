
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getDriverSession } from '@/lib/driver-auth';
import { z } from 'zod';

const StatusSchema = z.object({
    status: z.enum(['FREE', 'OFF_DUTY', 'BUSY'])
});

export async function POST(req: Request) {
    try {
        const driver = await getDriverSession(req);
        if (!driver) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const validation = StatusSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json({ error: "Invalid status" }, { status: 400 });
        }

        const { status } = validation.data;

        const updatedDriver = await prisma.driver.update({
            where: { id: driver.driverId },
            data: { status }
        });

        return NextResponse.json({ success: true, status: updatedDriver.status });

    } catch (error) {
        console.error("Status Update Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
