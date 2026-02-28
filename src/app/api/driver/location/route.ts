
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getDriverSession } from '@/lib/driver-auth';
import { z } from 'zod';

const LocationSchema = z.object({
    lat: z.number(),
    lng: z.number()
});

// Ray-casting algorithm to determine if a point is inside a polygon
function isPointInPolygon(point: { lat: number, lng: number }, polygon: { lat: number, lng: number }[]) {
    let isInside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const xi = polygon[i].lng, yi = polygon[i].lat;
        const xj = polygon[j].lng, yj = polygon[j].lat;

        const intersect = ((yi > point.lat) !== (yj > point.lat))
            && (point.lng < (xj - xi) * (point.lat - yi) / (yj - yi) + xi);
        if (intersect) isInside = !isInside;
    }
    return isInside;
}

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

        // 1. Update Driver Location Record
        await prisma.driver.update({
            where: { id: driver.driverId },
            data: {
                location: JSON.stringify({ lat, lng })
            }
        });

        // 2. Point in Polygon Zone Detection
        const zones = await prisma.zone.findMany({
            where: { tenantId: driver.tenantId }
        });

        let foundZoneId: string | null = null;

        for (const zone of zones) {
            try {
                const coordinates: { lat: number, lng: number }[] = JSON.parse(zone.coordinates);
                if (isPointInPolygon({ lat, lng }, coordinates)) {
                    foundZoneId = zone.id;
                    break; // Driver can only be in one zone at a time in this logic
                }
            } catch (e) {
                console.error(`Invalid zone coordinates for zone ${zone.id}`);
            }
        }

        // 3. Manage Zone Queue
        if (foundZoneId) {
            // Upsert the driver into the queue. If they are already there, it won't reset their joinedAt timestamp
            await prisma.zoneQueue.upsert({
                where: { driverId: driver.driverId },
                update: {
                    zoneId: foundZoneId // Update their zone if they crossed a border directly into another
                },
                create: {
                    driverId: driver.driverId,
                    zoneId: foundZoneId,
                    tenantId: driver.tenantId
                }
            });
        } else {
            // Driver is not in ANY zone, remove them from queues
            await prisma.zoneQueue.deleteMany({
                where: { driverId: driver.driverId }
            });
        }

        return NextResponse.json({ success: true, currentZoneId: foundZoneId });

    } catch (error) {
        console.error("Location Update Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
