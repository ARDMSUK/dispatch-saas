import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireDispatcher, requireTenantAdmin } from "@/utils/rbac";

export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: Promise<{ routeId: string }> }) {
    try {
        const { session, error: rbacError } = await requireDispatcher();
        if (rbacError) return rbacError;
        
        if (!session?.user?.tenantId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const routeId = (await params).routeId;
        const isDispatcher = session.user.role === 'DISPATCHER';

        const route = await prisma.contractRoute.findUnique({
            where: { id: routeId },
            include: {
                stops: {
                    orderBy: { sequenceIndex: 'asc' }
                },
                students: isDispatcher ? {
                    select: {
                        id: true,
                        name: true,
                        isSEN: true,
                        passengerAssistantRequired: true,
                        wheelchairRequired: true,
                        pickupHandoverInstructions: true,
                        dropoffHandoverInstructions: true,
                        authorisedPickupPerson: true,
                        authorisedDropoffPerson: true,
                        driverSafeNotes: true,
                    }
                } : true,
                contract: true
            }
        });

        if (!route || (route.contract.tenantId !== session.user.tenantId && session.user.role !== 'SUPER_ADMIN')) {
            return NextResponse.json({ error: 'Route not found or access denied' }, { status: 404 });
        }

        return NextResponse.json(route);
    } catch (error) {
        console.error('Failed to fetch route:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ routeId: string }> }) {
    try {
        const { session, error: rbacError } = await requireTenantAdmin();
        if (rbacError) return rbacError;

        if (!session?.user?.tenantId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const routeId = (await params).routeId;
        const body = await req.json();
        const { name, routeNumber, requiresWav, requiresPa, requiredDriverGender, requiredPaGender, defaultDriverId, defaultPaId, agreedPrice } = body;

        // Verify route belongs to tenant
        const route = await prisma.contractRoute.findUnique({
            where: { id: routeId },
            include: { contract: true }
        });

        if (!route || (route.contract.tenantId !== session.user.tenantId && session.user.role !== 'SUPER_ADMIN')) {
            return NextResponse.json({ error: 'Route not found or access denied' }, { status: 403 });
        }

        const updatedRoute = await prisma.contractRoute.update({
            where: { id: routeId },
            data: {
                name: name !== undefined ? name : undefined,
                routeNumber: routeNumber !== undefined ? routeNumber : undefined,
                requiresWav: requiresWav !== undefined ? requiresWav : undefined,
                requiresPa: requiresPa !== undefined ? requiresPa : undefined,
                requiredDriverGender: requiredDriverGender !== undefined ? requiredDriverGender : undefined,
                requiredPaGender: requiredPaGender !== undefined ? requiredPaGender : undefined,
                defaultDriverId: defaultDriverId !== undefined ? defaultDriverId : undefined,
                defaultPaId: defaultPaId !== undefined ? defaultPaId : undefined,
                agreedPrice: agreedPrice !== undefined ? agreedPrice : undefined,
            }
        });

        return NextResponse.json(updatedRoute);
    } catch (error) {
        console.error('Failed to update route:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
