import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

import { auth } from '@/auth';

export async function GET() {
    try {
        const session = await auth();
        if (!session?.user?.tenantId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const tenantId = session.user.tenantId;

        const [rules, fixedPrices, surcharges] = await Promise.all([
            prisma.pricingRule.findMany({ where: { tenantId } }),
            prisma.fixedPrice.findMany({ where: { tenantId } }),
            prisma.surcharge.findMany({ where: { tenantId } })
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
