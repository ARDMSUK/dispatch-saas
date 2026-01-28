
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const CreateFixedPriceSchema = z.object({
    name: z.string().min(1),
    pickup: z.string().min(1),
    dropoff: z.string().min(1),
    price: z.number().min(0),
    vehicleType: z.string().default('Saloon'),
    isReverse: z.boolean().default(true),
});

export async function GET(request: Request) {
    try {
        const tenant = await prisma.tenant.findUnique({
            where: { slug: 'demo-cabs' }
        });

        if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });

        const { searchParams } = new URL(request.url);
        const q = searchParams.get('q');

        const where: any = { tenantId: tenant.id };
        if (q) {
            where.OR = [
                { name: { contains: q } },
                { pickup: { contains: q } },
                { dropoff: { contains: q } }
            ];
        }

        const prices = await prisma.fixedPrice.findMany({
            where,
            orderBy: { name: 'asc' }
        });

        return NextResponse.json(prices);
    } catch (error) {
        console.error('Error fetching fixed prices:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const validation = CreateFixedPriceSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json({ error: 'Invalid data', details: validation.error }, { status: 400 });
        }

        const tenant = await prisma.tenant.findUnique({ where: { slug: 'demo-cabs' } });
        if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });

        const { name, pickup, dropoff, price, vehicleType, isReverse } = validation.data;

        const newPrice = await prisma.fixedPrice.create({
            data: {
                tenantId: tenant.id,
                name,
                pickup,
                dropoff,
                price,
                vehicleType,
                isReverse
            }
        });

        return NextResponse.json(newPrice, { status: 201 });
    } catch (error) {
        console.error('Error creating fixed price:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
