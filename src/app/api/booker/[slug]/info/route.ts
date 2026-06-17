import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
    req: Request,
    { params }: { params: Promise<{ slug: string }> }
) {
    try {
        const { slug } = await params;

        const tenant = await prisma.tenant.findUnique({
            where: { slug },
            select: {
                name: true,
                logoUrl: true,
                brandColor: true,
                enableWebBooker: true,
                pricingRules: {
                    select: { vehicleType: true }
                }
            }
        });

        if (!tenant) {
            return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
        }

        if (!tenant.enableWebBooker) {
            return NextResponse.json({ error: 'Web booking disabled' }, { status: 403 });
        }

        // Extract and deduplicate valid vehicle types
        const rawTypes = tenant.pricingRules?.map(r => r.vehicleType?.trim()) || [];
        const validTypes = rawTypes.filter(t => t && t.length > 0);
        const vehicleTypes = Array.from(new Set(validTypes));

        return NextResponse.json({
            name: tenant.name,
            logoUrl: tenant.logoUrl,
            brandColor: tenant.brandColor,
            enableWebBooker: tenant.enableWebBooker,
            vehicleTypes
        });

    } catch (error) {
        console.error('Error fetching public tenant info:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
