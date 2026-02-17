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
    let { pickup, dropoff, vias = [], distanceMiles = 0, vehicleType = 'Saloon', pickupTime = new Date(), companyId, pickupLat, pickupLng, dropoffLat, dropoffLng } = req;

    // 0. Auto-calculate distance if missing
    if ((!distanceMiles || distanceMiles === 0) && pickupLat && pickupLng && dropoffLat && dropoffLng) {
        distanceMiles = calculateDistance(pickupLat, pickupLng, dropoffLat, dropoffLng);
        console.log(`[Pricing] Calculated distance from coords: ${distanceMiles.toFixed(2)} miles`);
    }

    // 0. Check Tenant Configuration
    let useZonePricing = false;
    if (companyId) {
        const tenant = await prisma.tenant.findUnique({
            where: { id: companyId },
            select: { useZonePricing: true }
        });
        if (tenant?.useZonePricing) useZonePricing = true;
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
                // Prisma Decimal to number
                const price = Number(match.price);
                return {
                    price: price,
                    breakdown: {
                        base: price,
                        mileage: 0,
                        surcharges: [],
                        isFixed: true,
                        ruleId: match.id
                    }
                };
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
    const base = effectiveRule.baseRate ?? 3.00;
    const rate = effectiveRule.perMile ?? 2.00;
    const min = effectiveRule.minFare ?? 5.00;

    // 4. Calculate Base Price
    let total = base + (distanceMiles * rate);

    // --- Wait & Return Logic ---
    if (req.isWaitAndReturn) {
        // Round Trip Distance
        const roundTripDistance = distanceMiles * 2;
        // Recalculate base price for round trip (using base + mileage)
        total = base + (roundTripDistance * rate);

        // Add Waiting Time Cost
        if (req.waitingTime && req.waitingTime > 0) {
            const waitCost = req.waitingTime * (effectiveRule.waitingFreq || 0);
            total += waitCost;
        }
    }
    // ---------------------------

    // Fallback Multiplier if no DB rule found
    if (effectiveRule.id === 'default') {
        if (vehicleType === 'Estate' || vehicleType === 'Executive') total *= 1.2;
        if (vehicleType.includes('MPV') || vehicleType.includes('8-seater')) total *= 1.5;
    }

    // Min Charge
    if (total < min) total = min;

    // 4. Surcharges
    const surcharges = [];

    // Stop Surcharges
    if (vias.length > 0) {
        const stopCharge = vias.length * 5.00;
        total += stopCharge;
        surcharges.push({ name: `${vias.length} x Stops`, amount: stopCharge });
    }

    return {
        price: parseFloat(total.toFixed(2)),
        breakdown: {
            base: base,
            mileage: distanceMiles * rate,
            surcharges: surcharges,
            isFixed: false,
            ruleId: effectiveRule.id
        }
    };
}
