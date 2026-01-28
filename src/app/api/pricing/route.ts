import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        const tenant = await prisma.tenant.findUnique({
            where: { slug: 'demo-cabs' }
        });

        if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });

        const [rules, fixedPrices, surcharges] = await Promise.all([
            prisma.pricingRule.findMany({ where: { tenantId: tenant.id } }),
            prisma.fixedPrice.findMany({ where: { tenantId: tenant.id } }),
            prisma.surcharge.findMany({ where: { tenantId: tenant.id } })
        ]);

        return NextResponse.json({
            rules,
            fixedPrices,
            surcharges
        });
    } catch (error) {
        console.error('Error fetching pricing config:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
