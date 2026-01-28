
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const CreateSurchargeSchema = z.object({
    name: z.string().min(1),
    type: z.enum(['PERCENT', 'FLAT']),
    value: z.number().min(0),
    startDate: z.string().datetime().optional().nullable(),
    endDate: z.string().datetime().optional().nullable(),
    startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional().nullable(), // HH:MM
    endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional().nullable(),   // HH:MM
    daysOfWeek: z.string().optional().nullable(), // "0,6"
});

export async function GET() {
    try {
        const tenant = await prisma.tenant.findUnique({
            where: { slug: 'demo-cabs' }
        });

        if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });

        const surcharges = await prisma.surcharge.findMany({
            where: {
                tenantId: tenant.id
            },
            orderBy: {
                name: 'asc'
            }
        });

        return NextResponse.json(surcharges);
    } catch (error) {
        console.error('Error fetching surcharges:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const validation = CreateSurchargeSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json({ error: 'Invalid data', details: validation.error }, { status: 400 });
        }

        const tenant = await prisma.tenant.findUnique({ where: { slug: 'demo-cabs' } });
        if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });

        const { name, type, value, startDate, endDate, startTime, endTime, daysOfWeek } = validation.data;

        const newSurcharge = await prisma.surcharge.create({
            data: {
                tenantId: tenant.id,
                name,
                type,
                value,
                startDate,
                endDate,
                startTime,
                endTime,
                daysOfWeek
            }
        });

        return NextResponse.json(newSurcharge, { status: 201 });
    } catch (error) {
        console.error('Error creating surcharge:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
