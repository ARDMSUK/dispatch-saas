import { prisma } from '@/lib/prisma';

interface PricingRequest {
    pickup: string;
    dropoff: string;
    distanceMiles?: number;
    vehicleType?: string;
    pickupTime?: Date;
    tenantId: string;
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

export async function calculatePrice(req: PricingRequest): Promise<PriceResult> {
    const { pickup, dropoff, distanceMiles = 0, vehicleType = 'Saloon', pickupTime = new Date(), tenantId } = req;

    // 1. Check for Fixed Price (Exact Match logic for now, could be improved with zones)
    // We'll search for rules where pickup/dropoff roughly match the string
    // In a real app, this would use Zone IDs. For now, simple partial string match or exact match.

    // Optimisation: Fetch all fixed prices for tenant and filter in memory (dataset is small for MVP)
    const fixedPrices = await prisma.fixedPrice.findMany({
        where: {
            tenantId,
            vehicleType
        }
    });

    const matchedFixed = fixedPrices.find(fp => {
        // Simple case-insensitive inclusion match
        const pMatch = fp.pickup && pickup.toLowerCase().includes(fp.pickup.toLowerCase());
        const dMatch = fp.dropoff && dropoff.toLowerCase().includes(fp.dropoff.toLowerCase());

        if (pMatch && dMatch) return true;

        if (fp.isReverse) {
            const pRev = fp.pickup && dropoff.toLowerCase().includes(fp.pickup.toLowerCase());
            const dRev = fp.dropoff && pickup.toLowerCase().includes(fp.dropoff.toLowerCase());
            if (pRev && dRev) return true;
        }
        return false;
    });

    if (matchedFixed) {
        return {
            price: matchedFixed.price,
            breakdown: {
                base: matchedFixed.price,
                mileage: 0,
                surcharges: [],
                isFixed: true,
                ruleId: matchedFixed.id
            }
        };
    }

    // 2. Meter Pricing
    // Fetch base rates
    const pricingRule = await prisma.pricingRule.findUnique({
        where: {
            tenantId_vehicleType: {
                tenantId,
                vehicleType
            }
        }
    }) || { baseRate: 3.00, perMile: 2.00, minFare: 5.00 }; // Defaults

    let total = pricingRule.baseRate + (distanceMiles * pricingRule.perMile);

    // Enforce Minimum Fare
    if (total < pricingRule.minFare) {
        total = pricingRule.minFare;
    }

    const breakdown = {
        base: pricingRule.baseRate,
        mileage: distanceMiles * pricingRule.perMile,
        surcharges: [] as { name: string; amount: number }[],
        isFixed: false
    };

    // 3. Surcharges
    const surcharges = await prisma.surcharge.findMany({
        where: { tenantId }
    });

    // Check triggers
    const timeStr = pickupTime.toTimeString().slice(0, 5); // "HH:MM"
    const dayOfWeek = pickupTime.getDay().toString(); // "0" to "6"

    for (const s of surcharges) {
        let applies = false;

        // Date Range
        if (s.startDate && s.endDate) {
            if (pickupTime >= s.startDate && pickupTime <= s.endDate) applies = true;
        }

        // Time Range (Daily)
        if (s.startTime && s.endTime) {
            // Handle overnight range e.g. 22:00 to 06:00
            if (s.endTime < s.startTime) {
                if (timeStr >= s.startTime || timeStr <= s.endTime) applies = true;
            } else {
                if (timeStr >= s.startTime && timeStr <= s.endTime) applies = true;
            }
        }

        // Days of Week
        if (s.daysOfWeek && s.daysOfWeek.includes(dayOfWeek)) {
            applies = true;
        }

        // If applies, add cost
        if (applies) {
            let extra = 0;
            if (s.type === 'PERCENT') {
                extra = total * (s.value / 100);
            } else {
                extra = s.value;
            }
            total += extra;
            breakdown.surcharges.push({ name: s.name, amount: extra });
        }
    }

    return {
        price: parseFloat(total.toFixed(2)),
        breakdown
    };
}
