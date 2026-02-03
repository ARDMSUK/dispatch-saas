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

        // Group by Pickup Address
        const topPickups = await prisma.job.groupBy({
            by: ['pickupAddress'],
            where: { tenantId },
            _count: { pickupAddress: true },
            orderBy: { _count: { pickupAddress: 'desc' } },
            take: 10,
        });

        // Group by Dropoff Address
        const topDropoffs = await prisma.job.groupBy({
            by: ['dropoffAddress'],
            where: { tenantId },
            _count: { dropoffAddress: true },
            orderBy: { _count: { dropoffAddress: 'desc' } },
            take: 10,
        });

        // Merge and Count
        const locationMap = new Map<string, number>();

        topPickups.forEach(item => {
            const addr = item.pickupAddress;
            if (addr && addr.length > 5) {
                locationMap.set(addr, (locationMap.get(addr) || 0) + item._count.pickupAddress);
            }
        });

        topDropoffs.forEach(item => {
            const addr = item.dropoffAddress;
            if (addr && addr.length > 5) {
                locationMap.set(addr, (locationMap.get(addr) || 0) + item._count.dropoffAddress);
            }
        });

        // Convert to array and sort
        const sortedLocations = Array.from(locationMap.entries())
            .map(([address, count]) => ({ address, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5); // Top 5

        return NextResponse.json(sortedLocations);

    } catch (error) {
        console.error('Error fetching location stats:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
