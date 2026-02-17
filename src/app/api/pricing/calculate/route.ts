
import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { z } from 'zod';
import { calculatePrice } from '@/lib/pricing';

export const dynamic = 'force-dynamic';

const CalculateSchema = z.object({
    pickup: z.string(),
    dropoff: z.string(),
    vias: z.array(z.object({ address: z.string() })).optional(),
    distance: z.number().min(0).optional(),
    pickupLat: z.number().optional(),
    pickupLng: z.number().optional(),
    dropoffLat: z.number().optional(),
    dropoffLng: z.number().optional(),
    date: z.string().datetime().optional(), // ISO string, defaults to now
    vehicleType: z.string().default('Saloon'),
    waitingTime: z.number().min(0).optional(),
    isWaitAndReturn: z.boolean().optional()
}).passthrough();

import { auth } from "@/auth";

// ...

export async function POST(request: Request) {
    try {
        const supabase = await createClient();
        const session = await auth();

        if (!session) {
            console.error('Authentication session not found for pricing calculation.'); // Log session check failure
        }

        const body = await request.json();
        const validation = CalculateSchema.safeParse(body);

        if (!validation.success) {
            console.error("Validation failed", validation.error);
            return NextResponse.json({
                price: 15.00,
                breakdown: { base: 15.00, isFixed: false },
                error: 'Invalid data',
                details: validation.error
            }, { status: 200 }); // Return 200 so frontend shows the price/error
        }

        // Determine Tenant
        let companyId = session?.user?.tenantId;

        // If public (no session), try to find tenant from slug (or default to zercabs for MVP)
        if (!companyId) {
            // In real app, maybe pass tenantSlug in body?
            const publicSlug = 'demo-taxis';
            const tenant = await prisma.tenant.findUnique({ where: { slug: publicSlug } });
            if (tenant) companyId = tenant.id;
        }

        const { pickup, dropoff, vias, date: dateStr, vehicleType, distance } = validation.data;
        const jobDate = dateStr ? new Date(dateStr) : new Date();

        const result = await calculatePrice({
            pickup,
            dropoff,
            vias,
            distanceMiles: distance, // If 0, it falls back to 0 in lib
            vehicleType,
            pickupTime: jobDate,
            companyId: companyId,
            waitingTime: validation.data.waitingTime,
            isWaitAndReturn: validation.data.isWaitAndReturn,
            pickupLat: validation.data.pickupLat,
            pickupLng: validation.data.pickupLng,
            dropoffLat: validation.data.dropoffLat,
            dropoffLng: validation.data.dropoffLng
        });

        // Debug info or extra details can be added here
        return NextResponse.json({
            ...result,
            debug: { message: 'Supabase Pricing Engine', usedDistance: distance }
        });

    } catch (error: any) {
        console.error('Error calculating price:', error);
        return NextResponse.json({
            price: 15.00,
            breakdown: { base: 15.00, isFixed: false },
            error: `Calculation failed: ${error?.message || error}`
        });
    }
}
