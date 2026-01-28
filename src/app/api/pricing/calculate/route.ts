
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { geocodeAddress, getRouteDistance, isPointInZone } from '@/lib/geocoding';

const CalculateSchema = z.object({
    pickup: z.string(),
    dropoff: z.string(),
    // Optional now because we calculate it if missing
    distance: z.number().min(0).optional(),
    date: z.string().datetime().optional(), // ISO string, defaults to now
    vehicleType: z.string().default('Saloon')
});

function isTimeInRange(targetDate: Date, startTime?: string | null, endTime?: string | null): boolean {
    if (!startTime || !endTime) return false;

    const minutes = targetDate.getHours() * 60 + targetDate.getMinutes();

    const [startH, startM] = startTime.split(':').map(Number);
    const startMinutes = startH * 60 + startM;

    const [endH, endM] = endTime.split(':').map(Number);
    const endMinutes = endH * 60 + endM;

    if (startMinutes <= endMinutes) {
        // e.g. 09:00 to 17:00
        return minutes >= startMinutes && minutes <= endMinutes;
    } else {
        // e.g. 22:00 to 06:00 (crosses midnight)
        return minutes >= startMinutes || minutes <= endMinutes;
    }
}

import { auth } from '@/auth';

export async function POST(request: Request) {
    try {
        const session = await auth();
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const tenantId = session.user.tenantId;

        const body = await request.json();
        const validation = CalculateSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json({ error: 'Invalid data', details: validation.error }, { status: 400 });
        }

        // Removed manual tenant lookup, using session tenantId
        const tenant = { id: tenantId };
        if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });

        const { pickup, dropoff, date: dateStr, vehicleType } = validation.data;
        let { distance } = validation.data;
        const jobDate = dateStr ? new Date(dateStr) : new Date();

        let finalPrice = 0;
        let breakdown: any[] = [];
        let isFixed = false;

        // ---------------------------------------------------------
        // 1. Geocoding & Routing (If distance not provided)
        // ---------------------------------------------------------
        let pickupCoords = null;
        let dropoffCoords = null;

        if (!distance || distance === 0) {
            // Try to geocode
            const [pGeo, dGeo] = await Promise.all([
                geocodeAddress(pickup),
                geocodeAddress(dropoff)
            ]);

            pickupCoords = pGeo;
            dropoffCoords = dGeo;

            if (pGeo && dGeo) {
                const route = await getRouteDistance(pGeo, dGeo);
                if (route) {
                    distance = route.distanceMiles;
                    breakdown.push({ type: 'INFO', name: `Calculated Distance: ${distance.toFixed(1)} miles` });
                } else {
                    // Fallback distance if routing fails
                    distance = 5.0; // Mock default
                    breakdown.push({ type: 'WARN', name: 'Routing failed, using default distance' });
                }
            } else {
                distance = 5.0; // Fallback if geocoding fails
                breakdown.push({ type: 'WARN', name: 'Geocoding failed, using default distance' });
            }
        }

        // ---------------------------------------------------------
        // 2. Zone Checking
        // ---------------------------------------------------------
        let pickupZoneId: string | null = null;
        let dropoffZoneId: string | null = null;

        if (pickupCoords && dropoffCoords) {
            const zones = await prisma.zone.findMany({ where: { tenantId: tenant.id } });

            for (const zone of zones) {
                try {
                    const polygon = JSON.parse(zone.coordinates);
                    if (!pickupZoneId && isPointInZone(pickupCoords, polygon)) {
                        pickupZoneId = zone.id;
                        breakdown.push({ type: 'INFO', name: `Pickup Zone: ${zone.name}` });
                    }
                    if (!dropoffZoneId && isPointInZone(dropoffCoords, polygon)) {
                        dropoffZoneId = zone.id;
                        breakdown.push({ type: 'INFO', name: `Dropoff Zone: ${zone.name}` });
                    }
                } catch (e) { console.error("Bad zone polygon", e); }
            }
        }

        // ---------------------------------------------------------
        // 3. Price Logic (Fixed w/ Zones > Fixed String Match > Metered)
        // ---------------------------------------------------------

        // A. Check Zone-to-Zone Fixed Price
        if (pickupZoneId && dropoffZoneId) {
            const zonePrice = await prisma.fixedPrice.findFirst({
                where: {
                    tenantId: tenant.id,
                    vehicleType,
                    pickupZoneId,
                    dropoffZoneId
                }
            });

            // Also check reverse?! Maybe later.

            if (zonePrice) {
                finalPrice = zonePrice.price;
                breakdown.push({ type: 'FIXED_ZONE', name: `Zone: ${zonePrice.name || 'Zone Transfer'}`, value: zonePrice.price });
                isFixed = true;
            }
        }

        // B. Check String Match Fixed Price (if no zone match)
        if (!isFixed) {
            const fixedPrices = await prisma.fixedPrice.findMany({
                where: {
                    tenantId: tenant.id,
                    vehicleType: vehicleType,
                    pickupZoneId: null, // Only pure string matches here
                    dropoffZoneId: null
                }
            });

            const match = fixedPrices.find(fp => {
                const pMatch = pickup.toLowerCase().includes(fp.pickup?.toLowerCase() || '___');
                const dMatch = dropoff.toLowerCase().includes(fp.dropoff?.toLowerCase() || '___');
                if (pMatch && dMatch) return true;
                if (fp.isReverse) {
                    const pRev = pickup.toLowerCase().includes(fp.dropoff?.toLowerCase() || '___');
                    const dRev = dropoff.toLowerCase().includes(fp.pickup?.toLowerCase() || '___');
                    if (pRev && dRev) return true;
                }
                return false;
            });

            if (match) {
                finalPrice = match.price;
                breakdown.push({ type: 'FIXED_ROUTE', name: match.name, value: match.price });
                isFixed = true;
            }
        }

        // C. Metered Calculation
        if (!isFixed) {
            // Need a valid distance now
            const dist = distance || 0;
            const rule = await prisma.pricingRule.findUnique({
                where: {
                    tenantId_vehicleType: {
                        tenantId: tenant.id,
                        vehicleType: vehicleType
                    }
                }
            });

            if (!rule) {
                const base = 3.00;
                const rate = 2.00;
                const fare = base + (dist * rate);
                finalPrice = Math.max(fare, 5.00);
                breakdown.push(
                    { type: 'BASE', name: 'Base Rate (Default)', value: base },
                    { type: 'MILEAGE', name: `${dist.toFixed(1)} miles @ ${rate}/mi`, value: dist * rate }
                );
            } else {
                const mileageCost = dist * rule.perMile;
                const fare = rule.baseRate + mileageCost;
                finalPrice = Math.max(fare, rule.minFare);

                breakdown.push(
                    { type: 'BASE', name: 'Base Rate', value: rule.baseRate },
                    { type: 'MILEAGE', name: `${dist.toFixed(1)} miles @ ${rule.perMile}/mi`, value: mileageCost }
                );

                if (finalPrice === rule.minFare && fare < rule.minFare) {
                    breakdown.push({ type: 'MIN_FARE_ADJUSTMENT', name: 'Min Fare', value: rule.minFare - fare });
                }
            }
        }

        // ---------------------------------------------------------
        // 4. Surcharges (Apply on top)
        // ---------------------------------------------------------
        const surcharges = await prisma.surcharge.findMany({
            where: { tenantId: tenant.id }
        });

        for (const s of surcharges) {
            let matchesAllConditions = true;
            let hasConditions = false;

            if (s.startDate && s.endDate) {
                hasConditions = true;
                if (jobDate < s.startDate || jobDate > s.endDate) matchesAllConditions = false;
            }
            if (s.startTime && s.endTime) {
                hasConditions = true;
                if (!isTimeInRange(jobDate, s.startTime, s.endTime)) matchesAllConditions = false;
            }
            if (s.daysOfWeek) {
                hasConditions = true;
                const days = s.daysOfWeek.split(',').map(Number);
                if (!days.includes(jobDate.getDay())) matchesAllConditions = false;
            }

            if (hasConditions && matchesAllConditions) {
                let amount = 0;
                if (s.type === 'PERCENT') {
                    amount = finalPrice * (s.value / 100);
                } else {
                    amount = s.value;
                }
                finalPrice += amount;
                breakdown.push({ type: 'SURCHARGE', name: s.name, value: amount });
            }
        }

        return NextResponse.json({
            price: Number(finalPrice.toFixed(2)),
            isFixed,
            breakdown,
            debug: { pickupCoords, dropoffCoords, pickupZoneId, dropoffZoneId }
        });

    } catch (error) {
        console.error('Error calculating price:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
