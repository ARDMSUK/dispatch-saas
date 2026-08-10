import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPassengerToken } from '@/lib/passenger-auth';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
    return new Response(null, { status: 204, headers: corsHeaders });
}

export async function GET(
    req: Request,
    { params }: { params: Promise<{ slug: string }> }
) {
    try {
        const { slug } = await params;
        const tenant = await prisma.tenant.findUnique({
            where: { slug }
        });

        if (!tenant) {
            return NextResponse.json({ error: 'Tenant not found' }, { status: 404, headers: corsHeaders });
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
        } else {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
        }

        const jobs = await prisma.job.findMany({
            where: {
                tenantId: tenant.id,
                customerId: authPayload.customerId
            },
            orderBy: {
                pickupTime: 'desc'
            },
            include: {
                driver: {
                    select: {
                        id: true,
                        name: true,
                        phone: true,
                        callsign: true,
                        status: true,
                        vehicles: true
                    }
                }
            }
        });

        return NextResponse.json(jobs, { headers: corsHeaders });
    } catch (e) {
        console.error('Error fetching passenger rides:', e);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: corsHeaders });
    }
}
