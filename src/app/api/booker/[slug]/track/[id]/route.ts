import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPassengerToken } from '@/lib/passenger-auth';

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,OPTIONS",
    "Access-Control-Allow-Headers": "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization",
};

export async function OPTIONS() {
    return new Response(null, { status: 204, headers: corsHeaders });
}

export async function GET(
    request: Request,
    { params }: { params: Promise<{ slug: string; id: string }> }
) {
    try {
        const resolvedParams = await params;
        const tenantSlug = resolvedParams.slug;
        const jobId = parseInt(resolvedParams.id, 10);

        if (isNaN(jobId)) {
            return NextResponse.json({ error: 'Invalid Job ID' }, { status: 400, headers: corsHeaders });
        }

        const authPayload = await verifyPassengerToken(request);
        if (!authPayload) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
        }

        const tenant = await prisma.tenant.findUnique({
            where: { slug: tenantSlug }
        });

        if (!tenant) {
            return NextResponse.json({ error: 'Tenant not found' }, { status: 404, headers: corsHeaders });
        }

        if (tenant.id !== authPayload.tenantId) {
            return NextResponse.json({ error: 'Unauthorized for this tenant' }, { status: 403, headers: corsHeaders });
        }

        const job = await prisma.job.findUnique({
            where: {
                id: jobId,
                tenantId: authPayload.tenantId,
                customerId: authPayload.customerId
            },
            include: {
                driver: true
            }
        });

        if (!job) {
            return NextResponse.json({ error: 'Job not found' }, { status: 404, headers: corsHeaders });
        }

        // Return a public-safe view of the job
        const trackingData = {
            id: job.id,
            status: job.status,
            pickupAddress: job.pickupAddress,
            pickupLat: job.pickupLat,
            pickupLng: job.pickupLng,
            dropoffAddress: job.dropoffAddress,
            dropoffLat: job.dropoffLat,
            dropoffLng: job.dropoffLng,
            price: job.fare,
            vehicleClass: job.vehicleType,
            driverName: job.driver?.name || null,
            driverLat: job.driver?.currentLat || null,
            driverLng: job.driver?.currentLng || null,
            lastLocationUpdate: job.driver?.lastLocationUpdate || null,
        };

        return NextResponse.json(trackingData, { headers: corsHeaders });

    } catch (error) {
        console.error('Error fetching job tracking data:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500, headers: corsHeaders }
        );
    }
}
