import { prisma } from '@/lib/prisma';

export function getLocalServiceDayBounds(dateString: string, timeZone: string = 'Europe/London') {
    const [y, m, d] = dateString.split('-').map(Number);
    const noonUtc = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));

    const formatterOffset = new Intl.DateTimeFormat('en-GB', {
        timeZone,
        timeZoneName: 'longOffset'
    });

    const parts = formatterOffset.formatToParts(noonUtc);
    const tzNamePart = parts.find(p => p.type === 'timeZoneName')?.value;
    let offsetStr = "Z";
    if (tzNamePart && tzNamePart.startsWith('GMT')) {
        if (tzNamePart === 'GMT') {
            offsetStr = "Z";
        } else {
            offsetStr = tzNamePart.replace('GMT', '');
        }
    }

    const startOfDayStr = `${dateString}T00:00:00.000${offsetStr}`;
    const startOfDay = new Date(startOfDayStr);

    const endOfDayStr = `${dateString}T23:59:59.999${offsetStr}`;
    const endOfDay = new Date(endOfDayStr);

    return { startOfDay, endOfDay, offsetStr };
}

export function calculatePickupTime(dateString: string, scheduledTime: string | null | undefined, timeZone: string = 'Europe/London'): Date {
    if (!scheduledTime) {
        throw new Error("Missing scheduled time");
    }
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(scheduledTime.trim())) {
        throw new Error(`Malformed scheduled time: ${scheduledTime}`);
    }

    const { offsetStr } = getLocalServiceDayBounds(dateString, timeZone);
    const [hours, minutes] = scheduledTime.trim().split(':').map(n => n.padStart(2, '0'));
    const pickupTimeStr = `${dateString}T${hours}:${minutes}:00.000${offsetStr}`;
    return new Date(pickupTimeStr);
}

export function buildSafeSchoolJobNotes(routeName: string, students: any[]): string {
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

export async function findDuplicateJob(tenantId: string, contractRouteId: string, targetDateStr: string) {
    const { startOfDay, endOfDay } = getLocalServiceDayBounds(targetDateStr);

    return await prisma.job.findFirst({
        where: {
            tenantId,
            contractRouteId,
            pickupTime: {
                gte: startOfDay,
                lte: endOfDay
            }
        }
    });
}

export function mapRouteToJobData(tenantId: string, route: any, targetDateStr: string) {
    const firstStop = route.stops[0];
    const lastStop = route.stops[route.stops.length - 1];
    const intermediateStops = route.stops.slice(1, -1).map((stop: any) => ({
        address: stop.address,
        lat: stop.lat,
        lng: stop.lng
    }));

    const pickupTime = calculatePickupTime(targetDateStr, firstStop.scheduledTime);

    const passengerName = `School Run: ${route.name}`;
    const passengerPhone = route.contract?.account?.phone || "";
    const notes = buildSafeSchoolJobNotes(route.name, route.students);

    const anyWheelchair = route.students.some((s: any) => s.wheelchairRequired);
    const jobRequiresWav = route.requiresWav || anyWheelchair;

    return {
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
        passengers: 1,
        luggage: 0,
        vehicleType: jobRequiresWav ? 'WAV' : 'Saloon',
        requiresWav: jobRequiresWav,
        fare: route.agreedPrice,
        isFixedPrice: true
    };
}
