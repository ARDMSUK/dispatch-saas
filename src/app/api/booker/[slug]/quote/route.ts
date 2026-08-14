import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { calculatePrice } from '@/lib/pricing';
import { verifyPassengerToken } from '@/lib/passenger-auth';
import { getAuthoritativeDistance } from '@/lib/geocoding';

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

        const requestedDate = new Date(pickupTime);
        if (isNaN(requestedDate.getTime())) {
            return NextResponse.json({ error: 'Invalid pickup time.' }, { status: 400, headers: corsHeaders });
        }

        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        if (requestedDate < fiveMinutesAgo) {
            return NextResponse.json({ error: 'Pickup time cannot be in the past.' }, { status: 400, headers: corsHeaders });
        }

        const authHeader = req.headers.get('authorization');
        let authPayload = null;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            authPayload = await verifyPassengerToken(req);
            if (!authPayload) {
                return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
            }
            if (authPayload.tenantId !== tenant.id) {
                return NextResponse.json({ error: 'Unauthorized for this tenant' }, { status: 403, headers: corsHeaders });
            }
        }

        let authoritativeDistance = distanceMiles;
        if (authPayload) {
            try {
                const distance = await getAuthoritativeDistance(pickupLat, pickupLng, dropoffLat, dropoffLng, vias);
                if (distance !== undefined) {
                    authoritativeDistance = distance;
                } else {
                    authoritativeDistance = undefined; // Force calculatePrice to fallback if no coords
                }
            } catch (e: any) {
                return NextResponse.json({ error: e.message || 'Routing failed' }, { status: 400, headers: corsHeaders });
            }
        }

        const baseContext = {
            pickup,
            dropoff,
            vias,
            distanceMiles: authoritativeDistance,
            pickupTime: requestedDate,
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
        return NextResponse.json({ error: 'Internal server error: ' + (error as any).message }, { status: 500, headers: corsHeaders });
    }
}
