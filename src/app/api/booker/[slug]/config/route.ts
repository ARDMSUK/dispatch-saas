import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,OPTIONS",
    "Access-Control-Allow-Headers": "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version",
};

export async function OPTIONS() {
    return new Response(null, { status: 204, headers: corsHeaders });
}

export async function GET(
    request: Request,
    { params }: { params: Promise<{ slug: string }> }
) {
    try {
        const { slug } = await params;
        const tenant = await prisma.tenant.findUnique({
            where: { slug },
            select: {
                name: true,
                brandColor: true,
                logoUrl: true,
                stripePublishableKey: true,
                enableLiveTracking: true,
                useZonePricing: true,
                enableWavOptions: true,
                twilioFromNumber: true, // Required for whatsapp link
            }
        });

        if (!tenant) {
            return NextResponse.json(
                { error: 'Tenant configuration not found' },
                { status: 404, headers: corsHeaders }
            );
        }

        // We specifically ONLY return non-sensitive frontend configuration data.
        return NextResponse.json(tenant, { headers: corsHeaders });
    } catch (error: any) {
        console.error('Error fetching tenant config:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500, headers: corsHeaders }
        );
    }
}
