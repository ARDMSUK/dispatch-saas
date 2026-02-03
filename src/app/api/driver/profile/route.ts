import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getDriverSession } from '@/lib/driver-auth';

export async function GET(req: Request) {
    try {
        const session = await getDriverSession(req);
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const driver = await prisma.driver.findUnique({
            where: { id: session.driverId },
            include: {
                vehicles: true
            }
        });

        if (!driver) {
            return NextResponse.json({ error: "Driver not found" }, { status: 404 });
        }

        // Return safe data
        return NextResponse.json({
            id: driver.id,
            name: driver.name,
            callsign: driver.callsign,
            status: driver.status,
            email: driver.email,
            phone: driver.phone,
            vehicles: driver.vehicles,
            location: driver.location
        });

    } catch (error) {
        console.error("Driver Profile Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function PATCH(req: Request) {
    try {
        const session = await getDriverSession(req);
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { status, location } = body; // location might be {lat, lng} object, store as string

        const data: any = {};
        if (status) data.status = status;
        if (location) data.location = JSON.stringify(location);

        const updated = await prisma.driver.update({
            where: { id: session.driverId },
            data
        });

        return NextResponse.json(updated);

    } catch (error) {
        console.error("Driver Profile Update Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
