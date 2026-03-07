import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { calculatePrice } from '@/lib/pricing';

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,OPTIONS,PATCH,DELETE,POST,PUT",
    "Access-Control-Allow-Headers": "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version",
};

export async function OPTIONS() {
    return new Response(null, { status: 204, headers: corsHeaders });
}

export async function POST(
    req: Request,
    { params }: { params: Promise<{ slug: string }> }
) {
    try {
        const { slug } = await params;
        const body = await req.json();

        // 1. Find the Tenant by Slug and ensure WebBooker is enabled
        const tenant = await prisma.tenant.findUnique({
            where: { slug }
        });

        if (!tenant) {
            return NextResponse.json({ error: 'Tenant not found' }, { status: 404, headers: corsHeaders });
        }

        if (!tenant.enableWebBooker) {
            return NextResponse.json({ error: 'Web booking is not enabled for this tenant' }, { status: 403, headers: corsHeaders });
        }

        const {
            pickup,
            dropoff,
            vias,
            distanceMiles,
            pickupTime,
            vehicleType,
            isWaitAndReturn,
            waitingTime,
            pickupLat,
            pickupLng,
            dropoffLat,
            dropoffLng
        } = body;

        if (!pickup || !dropoff || !pickupTime) {
            return NextResponse.json({ error: 'Missing required fields (pickup, dropoff, pickupTime)' }, { status: 400, headers: corsHeaders });
        }

        const baseContext = {
            pickup,
            dropoff,
            vias,
            distanceMiles,
            pickupTime: new Date(pickupTime),
            companyId: tenant.id, // Auth-less injection
            isWaitAndReturn,
            waitingTime,
            pickupLat,
            pickupLng,
            dropoffLat,
            dropoffLng
        };

        if (vehicleType) {
            // 2. Return single vehicle calculation for existing Web Booker
            const result = await calculatePrice({
                ...baseContext,
                vehicleType
            });
            return NextResponse.json(result, { headers: corsHeaders });
        } else {
            // 3. Return multiple vehicle options for the Mobile Customer App
            const vehicleTypes = [
                { class: 'Saloon', service: 'Standard' },
                { class: 'Estate', service: 'Plus' },
                { class: 'Executive', service: 'Premium' },
                { class: 'MPV', service: 'Extra Large' }
            ];

            const quotes = await Promise.all(vehicleTypes.map(async (vt) => {
                const res = await calculatePrice({ ...baseContext, vehicleType: vt.class });
                return {
                    vehicleClass: vt.class,
                    serviceType: vt.service,
                    price: res.price,
                    isEstimated: !res.breakdown.isFixed
                };
            }));

            return NextResponse.json({ quotes }, { headers: corsHeaders });
        }

    } catch (error) {
        console.error('Error calculating public quote:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: corsHeaders });
    }
}
