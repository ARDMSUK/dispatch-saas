
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
import { z } from 'zod';

const CreateZoneSchema = z.object({
    name: z.string().min(1),
    color: z.string().optional(),
    coordinates: z.string(), // Validated as JSON on usage
});

export async function GET() {
    try {
        const tenant = await prisma.tenant.findUnique({
            where: { slug: 'demo-cabs' }
        });

        if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });

        const zones = await prisma.zone.findMany({
            where: { tenantId: tenant.id },
            orderBy: { name: 'asc' }
        });

        return NextResponse.json(zones);
    } catch (error) {
        console.error('Error fetching zones:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const validation = CreateZoneSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json({ error: 'Invalid data', details: validation.error }, { status: 400 });
        }

        const tenant = await prisma.tenant.findUnique({ where: { slug: 'demo-cabs' } });
        if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });

        const { name, color, coordinates } = validation.data;

        const zone = await prisma.zone.create({
            data: {
                tenantId: tenant.id,
                name,
                color,
                coordinates
            }
        });

        return NextResponse.json(zone, { status: 201 });
    } catch (error) {
        console.error('Error creating zone:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
