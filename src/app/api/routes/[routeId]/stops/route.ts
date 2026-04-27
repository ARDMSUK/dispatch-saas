import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: Request, { params }: { params: { routeId: string } }) {
    try {
        const session = await auth();
        if (!session?.user?.tenantId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const routeId = params.routeId;
        const body = await req.json();
        const { address, lat, lng, type, sequenceIndex, scheduledTime } = body;

        if (!address) {
            return NextResponse.json({ error: 'Address is required' }, { status: 400 });
        }

        // Verify route belongs to tenant contract
        const route = await prisma.contractRoute.findUnique({
            where: { id: routeId },
            include: { contract: true }
        });

        if (!route || route.contract.tenantId !== session.user.tenantId) {
            return NextResponse.json({ error: 'Route not found or access denied' }, { status: 403 });
        }

        const stop = await prisma.routeStop.create({
            data: {
                contractRouteId: routeId,
                address,
                lat: lat || null,
                lng: lng || null,
                type: type || 'PICKUP',
                sequenceIndex: sequenceIndex !== undefined ? sequenceIndex : 0,
                scheduledTime: scheduledTime || null
            }
        });

        return NextResponse.json(stop, { status: 201 });
    } catch (error) {
        console.error('Failed to add stop:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
