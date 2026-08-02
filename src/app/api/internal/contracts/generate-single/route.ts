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

        // Build deterministic driver-safe notes
        const notes = buildSafeSchoolJobNotes(route.name, route.students);
        
        // Determine operational WAV requirement
        const anyWheelchair = route.students.some(s => s.wheelchairRequired);
        const jobRequiresWav = route.requiresWav || anyWheelchair;

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
                vehicleType: jobRequiresWav ? 'WAV' : 'Saloon',
                requiresWav: jobRequiresWav,
                fare: route.agreedPrice,
                isFixedPrice: true
            }
        });

        return NextResponse.json({ id: job.id, status: 'CREATED' }, { status: 201 });
    } catch (error) {
        console.error('Error generating single contract job:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

function buildSafeSchoolJobNotes(routeName: string, students: any[]): string {
    if (!students || students.length === 0) {
        return `School contract route: ${routeName}`;
    }

    const firstNames = students.map(s => s.name.split(' ')[0]).join(', ');
    let notes = `School Contract Run\nPassengers: ${firstNames}\n`;

    for (const student of students) {
        const firstName = student.name.split(' ')[0];
        
        let studentSection = `\n${firstName}:\n`;
        let hasContent = false;

        if (student.passengerAssistantRequired) {
            studentSection += `PA required: Yes\n`;
            hasContent = true;
        }
        if (student.wheelchairRequired) {
            studentSection += `WAV required: Yes\n`;
            hasContent = true;
        }
        if (student.pickupHandoverInstructions?.trim()) {
            studentSection += `Pickup handover: ${student.pickupHandoverInstructions.trim()}\n`;
            hasContent = true;
        }
        if (student.dropoffHandoverInstructions?.trim()) {
            studentSection += `Dropoff handover: ${student.dropoffHandoverInstructions.trim()}\n`;
            hasContent = true;
        }
        if (student.authorisedPickupPerson?.trim()) {
            studentSection += `Authorised pickup: ${student.authorisedPickupPerson.trim()}\n`;
            hasContent = true;
        }
        if (student.authorisedDropoffPerson?.trim()) {
            studentSection += `Authorised dropoff: ${student.authorisedDropoffPerson.trim()}\n`;
            hasContent = true;
        }
        if (student.driverSafeNotes?.trim()) {
            studentSection += `Driver notes: ${student.driverSafeNotes.trim()}\n`;
            hasContent = true;
        }

        if (hasContent) {
            notes += studentSection;
        }
    }

    notes += `\n\nOnly driver-safe information shown. Contact office for restricted safeguarding notes.`;

    return notes.trim();
}
