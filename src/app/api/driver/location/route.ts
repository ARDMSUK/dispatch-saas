
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getDriverSession } from '@/lib/driver-auth';
import { z } from 'zod';

const LocationSchema = z.object({
    lat: z.number(),
    lng: z.number()
});

export async function POST(req: Request) {
    try {
        const driver = await getDriverSession(req);
        if (!driver) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const validation = LocationSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json({ error: "Invalid location data" }, { status: 400 });
        }

        const { lat, lng } = validation.data;

        await prisma.driver.update({
            where: { id: driver.driverId },
            data: {
                location: JSON.stringify({ lat, lng })
            }
        });

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error("Location Update Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
