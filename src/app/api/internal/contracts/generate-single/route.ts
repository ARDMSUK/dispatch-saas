import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireDispatcher } from '@/utils/rbac';
import { findDuplicateJob, mapRouteToJobData } from '@/lib/contracts/job-generation';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    try {
        const { session, error: rbacError } = await requireDispatcher();
        if (rbacError) return rbacError;

        const tenantId = session.user.tenantId;

        const body = await req.json();
        const { contractRouteId, targetDate } = body;

        if (!contractRouteId) {
            return NextResponse.json({ error: 'contractRouteId is required' }, { status: 400 });
        }
        if (!targetDate || isNaN(new Date(targetDate).getTime())) {
            return NextResponse.json({ error: 'valid targetDate (YYYY-MM-DD) is required' }, { status: 400 });
        }

        // Fetch route with stops, contract and students
        const route = await prisma.contractRoute.findUnique({
            where: {
                id: contractRouteId,
                ...(session.user.role !== 'SUPER_ADMIN' && { contract: { tenantId } })
            },
            include: {
                contract: {
                    include: { account: true }
                },
                stops: {
                    orderBy: { sequenceIndex: 'asc' }
                },
                students: {
                    select: {
                        id: true,
                        name: true,
                        passengerAssistantRequired: true,
                        wheelchairRequired: true,
                        pickupHandoverInstructions: true,
                        dropoffHandoverInstructions: true,
                        authorisedPickupPerson: true,
                        authorisedDropoffPerson: true,
                        driverSafeNotes: true,
                    },
                    orderBy: { name: 'asc' }
                }
            }
        });

        if (!route) {
            return NextResponse.json({ error: 'Contract Route not found or unauthorized' }, { status: 404 });
        }

        if (route.stops.length < 2) {
            return NextResponse.json({ error: 'Contract Route must have at least 2 stops' }, { status: 400 });
        }

        if (!route.contract.accountId) {
            return NextResponse.json({ error: 'Contract is missing linked accountId' }, { status: 400 });
        }

        if (route.agreedPrice === null || route.agreedPrice === undefined) {
            return NextResponse.json({ error: 'Route agreed price is required before generating a school job.' }, { status: 400 });
        }

        // Duplicate Check using shared precise logic
        const existingJob = await findDuplicateJob(tenantId, contractRouteId, targetDate);

        if (existingJob) {
            return NextResponse.json({ error: 'Job already exists for this route and date' }, { status: 409 });
        }

        const jobData = mapRouteToJobData(tenantId, route, targetDate);

        const job = await prisma.job.create({
            data: jobData
        });

        return NextResponse.json({ id: job.id, status: 'CREATED' }, { status: 201 });
    } catch (error) {
        console.error('Error generating single contract job:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
