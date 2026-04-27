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
        const { name, dateOfBirth, specialNeeds, medicalInfo, riskAssessmentNotes, parentContactName, parentContactPhone } = body;

        if (!name) {
            return NextResponse.json({ error: 'Student name is required' }, { status: 400 });
        }

        // Verify route belongs to tenant contract
        const route = await prisma.contractRoute.findUnique({
            where: { id: routeId },
            include: { contract: true }
        });

        if (!route || route.contract.tenantId !== session.user.tenantId) {
            return NextResponse.json({ error: 'Route not found or access denied' }, { status: 403 });
        }

        const student = await prisma.student.create({
            data: {
                tenantId: session.user.tenantId,
                contractRouteId: routeId,
                name,
                dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
                specialNeeds: specialNeeds || null,
                medicalInfo: medicalInfo || null,
                riskAssessmentNotes: riskAssessmentNotes || null,
                parentContactName: parentContactName || null,
                parentContactPhone: parentContactPhone || null
            }
        });

        return NextResponse.json(student, { status: 201 });
    } catch (error) {
        console.error('Failed to add student:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
