import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireTenantAdmin } from '@/utils/rbac';
import { findDuplicateJob } from '@/lib/contracts/job-generation';
import { addDays, parseISO, isBefore, isAfter, differenceInDays } from 'date-fns';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    try {
        const { session, error: rbacError } = await requireTenantAdmin();
        if (rbacError) return rbacError;

        const tenantId = session.user.tenantId;

        const body = await req.json();
        const { contractRouteId, startDate, endDate, operatingWeekdays, excludedDates } = body;

        // Input Validation
        if (!contractRouteId) {
            return NextResponse.json({ error: 'contractRouteId is required' }, { status: 400 });
        }

        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!startDate || !dateRegex.test(startDate)) {
            return NextResponse.json({ error: 'valid startDate (YYYY-MM-DD) is required' }, { status: 400 });
        }
        if (!endDate || !dateRegex.test(endDate)) {
            return NextResponse.json({ error: 'valid endDate (YYYY-MM-DD) is required' }, { status: 400 });
        }

        const parsedStart = parseISO(startDate);
        const parsedEnd = parseISO(endDate);

        if (isNaN(parsedStart.getTime()) || isNaN(parsedEnd.getTime())) {
            return NextResponse.json({ error: 'Invalid calendar dates' }, { status: 400 });
        }

        if (isBefore(parsedEnd, parsedStart)) {
            return NextResponse.json({ error: 'endDate cannot be before startDate' }, { status: 400 });
        }

        const maxRangeDays = 366;
        if (differenceInDays(parsedEnd, parsedStart) > maxRangeDays) {
            return NextResponse.json({ error: `Maximum generation range is ${maxRangeDays} days` }, { status: 400 });
        }

        if (!Array.isArray(operatingWeekdays) || operatingWeekdays.length === 0) {
            return NextResponse.json({ error: 'At least one operatingWeekday (0-6) must be selected' }, { status: 400 });
        }

        const validWeekdays = new Set([0, 1, 2, 3, 4, 5, 6]);
        for (const wd of operatingWeekdays) {
            if (!validWeekdays.has(wd)) {
                return NextResponse.json({ error: 'Invalid weekday value. Must be 0-6' }, { status: 400 });
            }
        }

        const excludedSet = new Set<string>();
        if (Array.isArray(excludedDates)) {
            if (excludedDates.length > 200) {
                return NextResponse.json({ error: 'Too many excluded dates' }, { status: 400 });
            }
            for (const ed of excludedDates) {
                if (!dateRegex.test(ed) || isNaN(parseISO(ed).getTime())) {
                    return NextResponse.json({ error: `Invalid excluded date format: ${ed}` }, { status: 400 });
                }
                excludedSet.add(ed);
            }
        }

        // Fetch Route
        const route = await prisma.contractRoute.findUnique({
            where: {
                id: contractRouteId,
                ...(session.user.role !== 'SUPER_ADMIN' && { contract: { tenantId } })
            },
            include: {
                stops: {
                    orderBy: {
                        sequenceIndex: 'asc'
                    }
                },
                contract: true,
            }
        });

        if (!route) {
            return NextResponse.json({ error: 'Contract Route not found or unauthorized' }, { status: 404 });
        }

        // Validate Route Eligibility
        if (route.stops.length < 2) {
            return NextResponse.json({ error: 'Route must have at least two usable ordered stops' }, { status: 400 });
        }

        const firstStop = route.stops[0];
        const lastStop = route.stops[route.stops.length - 1];

        // Ensure every stop has a valid address
        for (const stop of route.stops) {
            if (!stop.address || stop.address.trim() === '') {
                return NextResponse.json({ error: 'Every required stop must contain a valid address' }, { status: 400 });
            }
        }

        if (!firstStop.scheduledTime) {
            return NextResponse.json({ error: 'First stop must have a scheduled time' }, { status: 400 });
        }

        const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
        if (!timeRegex.test(firstStop.scheduledTime.trim())) {
            return NextResponse.json({ error: `Malformed scheduled time: ${firstStop.scheduledTime}` }, { status: 400 });
        }

        if (!route.contract?.accountId) {
            return NextResponse.json({ error: 'Route contract must be linked to a valid account' }, { status: 400 });
        }

        // Generate Plan
        const previewDates = [];
        const skippedDates = [];
        const duplicateDates = [];
        let currentDate = parsedStart;

        while (!isAfter(currentDate, parsedEnd)) {
            const dateStr = currentDate.toISOString().split('T')[0];
            const dayOfWeek = currentDate.getDay(); // 0 (Sun) - 6 (Sat)

            let skipReason = null;

            if (!operatingWeekdays.includes(dayOfWeek)) {
                skipReason = 'Non-operating weekday';
            } else if (excludedSet.has(dateStr)) {
                skipReason = 'Excluded date';
            }

            if (skipReason) {
                skippedDates.push({ date: dateStr, reason: skipReason });
            } else {
                // Check Duplicate
                const existingJob = await findDuplicateJob(tenantId, contractRouteId, dateStr);

                if (existingJob) {
                    duplicateDates.push({ date: dateStr, reason: 'Duplicate job already exists' });
                } else {
                    previewDates.push({ date: dateStr });
                }
            }

            currentDate = addDays(currentDate, 1);
        }

        return NextResponse.json({
            status: 'PREVIEW',
            contractRouteId: route.id,
            routeName: route.name,
            totalProposed: previewDates.length,
            proposedDates: previewDates,
            skippedDates,
            duplicateDates
        }, { status: 200 });

    } catch (error) {
        console.error('Error in bulk generation preview:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
