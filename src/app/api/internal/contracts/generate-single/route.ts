import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireDispatcher } from '@/utils/rbac';

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

        // Parse targetDate to local day boundaries
        const targetStart = new Date(targetDate);
        targetStart.setHours(0, 0, 0, 0);
        const targetEnd = new Date(targetDate);
        targetEnd.setHours(23, 59, 59, 999);

        // Fetch route with stops, contract and students
        const route = await prisma.contractRoute.findUnique({
            where: {
                id: contractRouteId,
                contract: { tenantId }
            },
            include: {
                contract: {
                    include: { account: true }
                },
                stops: {
                    orderBy: { sequenceIndex: 'asc' }
                },
                students: true
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

        // Duplicate Check
        const existingJob = await prisma.job.findFirst({
            where: {
                tenantId,
                contractRouteId,
                pickupTime: {
                    gte: targetStart,
                    lte: targetEnd
                }
            }
        });

        if (existingJob) {
            return NextResponse.json({ error: 'Job already exists for this route and date' }, { status: 409 });
        }

        const firstStop = route.stops[0];
        const lastStop = route.stops[route.stops.length - 1];
        const intermediateStops = route.stops.slice(1, -1).map(stop => ({
            address: stop.address,
            lat: stop.lat,
            lng: stop.lng
        }));

        // Parse scheduled time from first stop (e.g. "07:30")
        const pickupTime = new Date(targetStart);
        if (firstStop.scheduledTime && firstStop.scheduledTime.includes(':')) {
            const [hours, minutes] = firstStop.scheduledTime.split(':').map(Number);
            pickupTime.setHours(hours, minutes, 0, 0);
        } else {
            // fallback if empty
            pickupTime.setHours(8, 0, 0, 0);
        }

        // passengerName = "School Run: " + route.name
        const passengerName = `School Run: ${route.name}`;
        
        // passengerPhone
        const passengerPhone = route.contract.account.phone || "";

        // Notes = minimal non-sensitive data
        const studentNames = route.students.map(s => s.name.split(' ')[0]).join(', ');
        const notes = studentNames ? `Students: ${studentNames}` : `School contract route: ${route.name}`;

        const job = await prisma.job.create({
            data: {
                tenantId,
                accountId: route.contract.accountId,
                contractRouteId: route.id,
                
                pickupAddress: firstStop.address,
                pickupLat: firstStop.lat,
                pickupLng: firstStop.lng,
                
                dropoffAddress: lastStop.address,
                dropoffLat: lastStop.lat,
                dropoffLng: lastStop.lng,
                
                vias: intermediateStops.length > 0 ? intermediateStops : undefined,
                
                pickupTime: pickupTime,
                
                passengerName,
                passengerPhone,
                
                paymentType: 'ACCOUNT',
                paymentStatus: 'UNPAID',
                isBilled: false,
                
                status: 'PENDING',
                autoDispatch: false,
                
                preAssignedDriverId: route.defaultDriverId || undefined,
                
                notes,

                // Fill mandatory defaults if not provided above
                passengers: 1,
                luggage: 0,
                vehicleType: route.requiresWav ? 'WAV' : 'Saloon',
                requiresWav: route.requiresWav,
                fare: 0.00,
                isFixedPrice: true
            }
        });

        return NextResponse.json({ id: job.id, status: 'CREATED' }, { status: 201 });
    } catch (error) {
        console.error('Error generating single contract job:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
