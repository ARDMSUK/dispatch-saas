
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const UpdatePricingRuleSchema = z.object({
    vehicleType: z.string().min(1),
    baseRate: z.number().min(0),
    perMile: z.number().min(0),
    minFare: z.number().min(0),
});

export async function GET() {
    try {
        const tenant = await prisma.tenant.findUnique({
            where: { slug: 'demo-cabs' }
        });

        if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });

        const rules = await prisma.pricingRule.findMany({
            where: {
                tenantId: tenant.id
            },
            orderBy: {
                vehicleType: 'asc'
            }
        });

        return NextResponse.json(rules);
    } catch (error) {
        console.error('Error fetching pricing rules:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const validation = UpdatePricingRuleSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json({ error: 'Invalid data', details: validation.error }, { status: 400 });
        }

        const tenant = await prisma.tenant.findUnique({ where: { slug: 'demo-cabs' } });
        if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });

        const { vehicleType, baseRate, perMile, minFare } = validation.data;

        // Upsert rule for this vehicle type
        const rule = await prisma.pricingRule.upsert({
            where: {
                tenantId_vehicleType: {
                    tenantId: tenant.id,
                    vehicleType
                }
            },
            update: {
                baseRate,
                perMile,
                minFare
            },
            create: {
                tenantId: tenant.id,
                name: `${vehicleType} Tariff`,
                vehicleType,
                baseRate,
                perMile,
                minFare
            }
        });

        return NextResponse.json(rule);
    } catch (error) {
        console.error('Error saving pricing rule:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
