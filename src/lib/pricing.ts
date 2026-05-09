import { prisma } from '@/lib/prisma';
import { isPointInPolygon } from '@/lib/geoutils';

interface CalculatePriceParams {
    pickup: string;
    dropoff: string;
    vias?: { address: string }[];
    distanceMiles?: number;
    pickupTime: Date;
    vehicleType?: string;
    companyId?: string; // Optional tenant context
    waitingTime?: number; // Minutes
    isWaitAndReturn?: boolean;
    pickupLat?: number;
    pickupLng?: number;
    dropoffLat?: number;
    dropoffLng?: number;
}

interface PriceResult {
    price: number;
    breakdown: {
        base: number;
        mileage: number;
        surcharges: { name: string; amount: number }[];
        isFixed: boolean;
        ruleId?: string;
    };
}

import { calculateDistance } from '@/lib/geoutils';

export async function calculatePrice(req: CalculatePriceParams): Promise<PriceResult> {
    const { pickup, dropoff, vias = [], vehicleType = 'Saloon', pickupTime = new Date(), companyId, isWaitAndReturn, waitingTime } = req;
    let { distanceMiles = 0, pickupLat, pickupLng, dropoffLat, dropoffLng } = req;

    // 0. Auto-calculate distance if missing
    // FALLBACK: If coords are missing but we have addresses, try to geocode server-side
    if ((!pickupLat || !dropoffLat) && pickup && dropoff) {
        console.log("[Pricing] Missing coords, attempting server-side geocoding...");
        try {
            const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
            if (apiKey) {
                // Geocode Pickup
                if (!pickupLat || !pickupLng) {
                    const pRes = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(pickup)}&components=country:GB&key=${apiKey}`);
                    const pData = await pRes.json();
                    if (pData.results?.[0]?.geometry?.location) {
                        pickupLat = pData.results[0].geometry.location.lat;
                        pickupLng = pData.results[0].geometry.location.lng;
                    }
                }

                // Geocode Dropoff
                if (!dropoffLat || !dropoffLng) {
                    const dRes = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(dropoff)}&components=country:GB&key=${apiKey}`);
                    const dData = await dRes.json();
                    if (dData.results?.[0]?.geometry?.location) {
                        dropoffLat = dData.results[0].geometry.location.lat;
                        dropoffLng = dData.results[0].geometry.location.lng;
                    }
                }
            }
        } catch (e) {
            console.error("[Pricing] Server-side geocoding failed:", e);
        }
    }

    if ((!distanceMiles || distanceMiles === 0) && pickupLat && pickupLng && dropoffLat && dropoffLng) {
        distanceMiles = calculateDistance(pickupLat, pickupLng, dropoffLat, dropoffLng);
        console.log(`[Pricing] Calculated distance from coords: ${distanceMiles.toFixed(2)} miles`);
    }

    // 0. Check Tenant Configuration
    let useZonePricing = false;
    let enableDynamicPricing = false;
    let enableWaitCalculations = false;
    let outOfHoursStart: string | null = null;
    let outOfHoursEnd: string | null = null;

    if (companyId) {
        const tenant = await prisma.tenant.findUnique({
            where: { id: companyId },
            select: { useZonePricing: true, enableDynamicPricing: true, enableWaitCalculations: true, outOfHoursStart: true, outOfHoursEnd: true }
        });
        if (tenant?.useZonePricing) useZonePricing = true;
        if (tenant?.enableDynamicPricing) enableDynamicPricing = true;
        if (tenant?.enableWaitCalculations) enableWaitCalculations = true;
        outOfHoursStart = tenant?.outOfHoursStart || null;
        outOfHoursEnd = tenant?.outOfHoursEnd || null;
    }

    // 0.1 Zone Detection (If enabled)
    let pickupZoneId: string | null = null;
    let dropoffZoneId: string | null = null;

    if (useZonePricing && companyId && pickupLat && pickupLng && dropoffLat && dropoffLng) {
        console.log(`[Pricing] Checking zones for tenant ${companyId}`);
        const zones = await prisma.zone.findMany({
            where: { tenantId: companyId }
        });

        // Find Pickup Zone
        for (const zone of zones) {
            try {
                const coords = JSON.parse(zone.coordinates) as [number, number][];
                if (isPointInPolygon([pickupLat, pickupLng], coords)) {
                    pickupZoneId = zone.id;
                    console.log(`[Pricing] Pickup detected in zone: ${zone.name}`);
                    break;
                }
            } catch (e) {
                console.error(`Error parsing zone coords ${zone.name}`, e);
            }
        }

        // Find Dropoff Zone
        for (const zone of zones) {
            try {
                const coords = JSON.parse(zone.coordinates) as [number, number][];
                if (isPointInPolygon([dropoffLat, dropoffLng], coords)) {
                    dropoffZoneId = zone.id;
                    console.log(`[Pricing] Dropoff detected in zone: ${zone.name}`);
                    break;
                }
            } catch (e) { }
        }
    }

    // 1. Fixed Price Check
    let isFixedPrice = false;
    let fixedPriceAmount = 0;
    let fixedPriceRuleId = '';

    if (pickup && dropoff) {
        try {
            const fixedPrices = await prisma.fixedPrice.findMany({
                where: {
                    AND: [
                        companyId ? { tenantId: companyId } : {},
                        {
                            OR: [
                                // Case A: Exact String Match (Legacy)
                                {
                                    pickup: { contains: pickup, mode: 'insensitive' },
                                    dropoff: { contains: dropoff, mode: 'insensitive' }
                                },
                                // Case B: Zone Match (Point in Poly)
                                (pickupZoneId && dropoffZoneId) ? {
                                    pickupZoneId: pickupZoneId,
                                    dropoffZoneId: dropoffZoneId
                                } : {}
                            ]
                        }
                    ]
                }
            });

            if (fixedPrices.length > 0) {
                const match = fixedPrices[0];
                isFixedPrice = true;
                fixedPriceAmount = Number(match.price);
                fixedPriceRuleId = match.id;

                // Out of Hours check
                if (outOfHoursStart && outOfHoursEnd && match.outOfHoursPrice !== null) {
                    const pTime = new Date(pickupTime);
                    const pHH = pTime.getHours().toString().padStart(2, '0');
                    const pMM = pTime.getMinutes().toString().padStart(2, '0');
                    const pTimeString = `${pHH}:${pMM}`;
                    
                    let isOutOfHours = false;
                    if (outOfHoursStart <= outOfHoursEnd) {
                        isOutOfHours = (pTimeString >= outOfHoursStart && pTimeString <= outOfHoursEnd);
                    } else {
                        // Overnight (e.g. 23:00 to 06:00)
                        isOutOfHours = (pTimeString >= outOfHoursStart || pTimeString <= outOfHoursEnd);
                    }
                    
                    if (isOutOfHours) {
                        fixedPriceAmount = Number(match.outOfHoursPrice);
                        console.log(`[Pricing] Applied Out-of-Hours Fixed Price: £${fixedPriceAmount} (Time: ${pTimeString}, Range: ${outOfHoursStart}-${outOfHoursEnd})`);
                    }
                }
            }
        } catch (e) {
            console.error("Error querying fixed prices", e);
        }
    }

    // 2. Pricing Rules
    let rule = null;
    try {
        rule = await prisma.pricingRule.findFirst({
            where: {
                vehicleType: vehicleType,
                ...(companyId ? { tenantId: companyId } : {})
            }
        });
    } catch (e) {
        console.error("Error querying pricing rules", e);
    }

    const effectiveRule = rule || {
        // Fallback Default
        id: 'default',
        baseRate: 3.00,
        perMile: 2.00,
        minFare: 5.00,
        vehicleType: 'Saloon',
        waitingFreq: 0.00
    };

    // 3. Calculate
    const base = effectiveRule.baseRate ? Number(effectiveRule.baseRate) : 3.00;
    const rate = effectiveRule.perMile ? Number(effectiveRule.perMile) : 2.00;
    const min = effectiveRule.minFare ? Number(effectiveRule.minFare) : 5.00;

    // 4. Calculate Base Price
    let total = 0;

    if (isFixedPrice) {
        total = fixedPriceAmount;
    } else {
        total = base + (distanceMiles * rate);

        // --- Wait logic (Wait & Return or standalone) ---
        if (req.isWaitAndReturn) {
            // Round Trip Distance
            const roundTripDistance = distanceMiles * 2;
            // Recalculate base price for round trip (using base + mileage)
            total = base + (roundTripDistance * rate);
        }
    }

    // Add Waiting Time Cost (Always if requested + enabled, or if it's Wait & Return)
    let totalWaitCost = 0;
    if (req.waitingTime && req.waitingTime > 0) {
        if (req.isWaitAndReturn || enableWaitCalculations) {
            totalWaitCost = req.waitingTime * (effectiveRule.waitingFreq || 0);
        }
    }
    // ---------------------------

    // Fallback Multiplier if no DB rule found (and not fixed price)
    if (!isFixedPrice && effectiveRule.id === 'default') {
        if (vehicleType === 'Estate' || vehicleType === 'Executive') total *= 1.2;
        if (vehicleType.includes('MPV') || vehicleType.includes('8-seater')) total *= 1.5;
    }

    // Min Charge
    if (total < min) total = min;

    // 4. Surcharges (Stops, Wait, and Dynamic Surges)
    const surcharges = [];

    // Stop Surcharges
    if (vias.length > 0) {
        const stopCharge = vias.length * 5.00;
        total += stopCharge;
        surcharges.push({ name: `${vias.length} x Stops`, amount: stopCharge });
    }

    // Wait Surcharge
    if (totalWaitCost > 0) {
        total += totalWaitCost;
        surcharges.push({ name: `Waiting Time (${req.waitingTime}m)`, amount: totalWaitCost });
    }

    // Dynamic Surcharges (Surge Pricing)
    if (enableDynamicPricing && companyId) {
        try {
            const rules = await prisma.surcharge.findMany({
                where: { tenantId: companyId }
            });

            // Evaluation variables
            const pTime = new Date(pickupTime);
            // Day of week: 0 (Sun) to 6 (Sat)
            const pDay = pTime.getDay().toString();

            // Format time as HH:mm for comparison
            const pHH = pTime.getHours().toString().padStart(2, '0');
            const pMM = pTime.getMinutes().toString().padStart(2, '0');
            const pTimeString = `${pHH}:${pMM}`;

            for (const surcharge of rules) {
                let applies = false;

                // Priority 1: Exact Date Match
                if (surcharge.startDate && surcharge.endDate) {
                    if (pTime >= surcharge.startDate && pTime <= surcharge.endDate) {
                        applies = true;
                    }
                }
                // Priority 2: Recurring Weekly / Daily Match
                else {
                    let dayMatches = true;
                    let timeMatches = true;

                    if (surcharge.daysOfWeek) {
                        const activeDays = surcharge.daysOfWeek.split(',');
                        if (!activeDays.includes(pDay)) {
                            dayMatches = false;
                        }
                    }

                    if (surcharge.startTime && surcharge.endTime) {
                        // Handle overnight spanning surges e.g. 22:00 to 06:00
                        const sTime = surcharge.startTime;
                        const eTime = surcharge.endTime;

                        if (sTime <= eTime) {
                            timeMatches = (pTimeString >= sTime && pTimeString <= eTime);
                        } else {
                            // Overnight surge (e.g. >= 22:00 OR <= 06:00)
                            timeMatches = (pTimeString >= sTime || pTimeString <= eTime);
                        }
                    }

                    if (dayMatches && timeMatches) applies = true;
                }

                if (applies) {
                    let surgeAmount = 0;
                    if (surcharge.type === 'PERCENT') {
                        // multiplier e.g. 50% = base * 0.5
                        surgeAmount = (total * (surcharge.value / 100));
                    } else if (surcharge.type === 'FLAT') {
                        surgeAmount = surcharge.value;
                    }

                    if (surgeAmount > 0) {
                        surgeAmount = Number(parseFloat(surgeAmount.toString()).toFixed(2));
                        total += surgeAmount;
                        surcharges.push({ name: surcharge.name, amount: surgeAmount });
                    }
                }
            }

        } catch (e) {
            console.error("[Pricing] Error applying dynamic surcharges", e);
        }
    }

    return {
        price: parseFloat(total.toFixed(2)),
        breakdown: {
            base: isFixedPrice ? fixedPriceAmount : base,
            mileage: isFixedPrice ? 0 : distanceMiles * rate,
            surcharges: surcharges,
            isFixed: isFixedPrice,
            ruleId: isFixedPrice ? fixedPriceRuleId : effectiveRule.id
        }
    };
}
