import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    try {
        const session = await auth();
        if (!session?.user?.tenantId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { contractId, name, routeNumber, requiresWav, requiresPa, requiredDriverGender, requiredPaGender, defaultDriverId, defaultPaId } = body;

        if (!contractId || !name) {
            return NextResponse.json({ error: 'Contract ID and Route Name are required' }, { status: 400 });
        }

        // Verify contract belongs to tenant
        const contract = await prisma.contract.findUnique({
            where: { id: contractId, tenantId: session.user.tenantId }
        });

        if (!contract) {
            return NextResponse.json({ error: 'Contract not found or access denied' }, { status: 403 });
        }

        const route = await prisma.contractRoute.create({
            data: {
                contractId,
                name,
                routeNumber: routeNumber || null,
                requiresWav: requiresWav || false,
                requiresPa: requiresPa || false,
                requiredDriverGender: requiredDriverGender || null,
                requiredPaGender: requiredPaGender || null,
                defaultDriverId: defaultDriverId || null,
                defaultPaId: defaultPaId || null,
            }
        });

        return NextResponse.json(route, { status: 201 });
    } catch (error) {
        console.error('Failed to create route:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
