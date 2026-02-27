import { NextResponse } from 'next/server';
import { fetchFlightStatus } from '@/lib/flight-service';
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id || !session?.user?.tenantId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const url = new URL(req.url);
        const flightNumber = url.searchParams.get('flightNumber');

        if (!flightNumber) {
            return NextResponse.json({ error: 'Flight number is required' }, { status: 400 });
        }

        // Look up the aviation stack key for the current tenant
        const tenant = await prisma.tenant.findUnique({
            where: { id: session.user.tenantId },
            select: { aviationStackApiKey: true }
        });

        const data = await fetchFlightStatus(flightNumber, tenant?.aviationStackApiKey);

        return NextResponse.json(data);
    } catch (error) {
        console.error("Flight API Error:", error);
        return NextResponse.json({ error: 'Failed to fetch flight data' }, { status: 500 });
    }
}
