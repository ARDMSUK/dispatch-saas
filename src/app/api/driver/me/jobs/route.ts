import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyMobileToken } from '@/lib/mobile-auth';

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,OPTIONS,PATCH,DELETE,POST,PUT",
    "Access-Control-Allow-Headers": "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization",
};

export async function OPTIONS() {
    return new Response(null, { status: 204, headers: corsHeaders });
}

export async function GET(request: Request) {
    try {
        const authHeader = request.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
        }

        const token = authHeader.split(' ')[1];
        const payload = await verifyMobileToken(token);

        if (!payload || (!payload.id && !payload.driverId)) {
            return NextResponse.json({ error: 'Invalid token' }, { status: 401, headers: corsHeaders });
        }

        const driverId = payload.driverId || payload.id;

        // Fetch jobs for the driver
        const jobs = await prisma.job.findMany({
            where: {
                driverId: driverId as string,
                status: {
                    in: ['DISPATCHED', 'EN_ROUTE', 'ARRIVED', 'POB']
                }
            },
            include: {
                customer: true,
                tenant: true,
            },
            orderBy: {
                pickupTime: 'asc'
            }
        });

        const formattedJobs = jobs.map(job => ({
            id: job.id,
            status: job.status,
            pickupTime: job.pickupTime,
            pickupAddress: job.pickupAddress,
            pickupLat: job.pickupLat,
            pickupLng: job.pickupLng,
            dropoffAddress: job.dropoffAddress,
            dropoffLat: job.dropoffLat,
            dropoffLng: job.dropoffLng,
            price: job.fare,
            customerName: job.customer?.name,
            customerPhone: job.customer?.phone
        }));

        return NextResponse.json(formattedJobs, { headers: corsHeaders });

    } catch (error) {
        console.error('Error fetching driver jobs:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500, headers: corsHeaders }
        );
    }
}
