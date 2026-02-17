
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from "@/auth";

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    try {
        const session = await auth();
        if (!session?.user?.tenantId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const tenantId = session.user.tenantId;

        // Fetch drivers who are NOT OFF_DUTY
        // We might also filter by "last seen" if we had that timestamp
        const drivers = await prisma.driver.findMany({
            where: {
                tenantId,
                status: { not: 'OFF_DUTY' }
            },
            select: {
                id: true,
                name: true,
                callsign: true,
                status: true,
                location: true, // JSON string
                vehicleType: true, // We might need to join Vehicle table if not on Driver
            }
        });

        const driverLocations = drivers.map(d => {
            let lat = null;
            let lng = null;
            try {
                if (d.location) {
                    const parsed = JSON.parse(d.location);
                    lat = parsed.lat;
                    lng = parsed.lng;
                }
            } catch (e) {
                console.error(`Failed to parse location for driver ${d.callsign}`);
            }

            return {
                id: d.id,
                name: d.name,
                callsign: d.callsign,
                status: d.status,
                lat,
                lng,
                // If vehicleType is not directly on Driver, we might mock or fetch via relation if schema allows
                // For now, let's assume 'Saloon' or fetch if needed. 
                // Schema check: Driver has `vehicles: Vehicle[]`. 
                // We'll skip complex relation for this hotfix and just return identity.
            };
        }).filter(d => d.lat !== null && d.lng !== null); // Only return drivers with valid location

        return NextResponse.json(driverLocations);

    } catch (error) {
        console.error('Error fetching driver locations:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
