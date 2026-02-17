import { NextResponse } from 'next/server';
import { z } from 'zod';
import { calculatePrice } from '@/lib/pricing';
import { prisma } from '@/lib/prisma';

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

        let { pickup, dropoff, vias, date: dateStr, vehicleType, distance, pickupLat, pickupLng, dropoffLat, dropoffLng } = validation.data;
        const jobDate = dateStr ? new Date(dateStr) : new Date();

        // FALLBACK: If distance/coords are missing, try to geocode server-side
        if ((!distance || distance === 0) && (!pickupLat || !dropoffLat)) {
            console.log("Missing coords/distance, attempting server-side geocoding...");
            try {
                const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
                if (apiKey) {
                    // Geocode Pickup
                    const pRes = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(pickup)}&key=${apiKey}`);
                    const pData = await pRes.json();
                    if (pData.results?.[0]?.geometry?.location) {
                        pickupLat = pData.results[0].geometry.location.lat;
                        pickupLng = pData.results[0].geometry.location.lng;
                    }

                    // Geocode Dropoff
                    const dRes = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(dropoff)}&key=${apiKey}`);
                    const dData = await dRes.json();
                    if (dData.results?.[0]?.geometry?.location) {
                        dropoffLat = dData.results[0].geometry.location.lat;
                        dropoffLng = dData.results[0].geometry.location.lng;
                    }
                }
            } catch (e) {
                console.error("Server-side geocoding failed:", e);
            }
        }

        const result = await calculatePrice({
            pickup,
            dropoff,
            vias,
            distanceMiles: distance, // If 0, it falls back to 0 in lib UNLESS we now have coords
            vehicleType,
            pickupTime: jobDate,
            companyId: companyId,
            waitingTime: validation.data.waitingTime,
            isWaitAndReturn: validation.data.isWaitAndReturn,
            pickupLat,
            pickupLng,
            dropoffLat,
            dropoffLng
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
