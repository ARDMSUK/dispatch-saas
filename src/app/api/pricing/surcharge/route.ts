import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const CreateSurchargeSchema = z.object({
    name: z.string().min(1),
    type: z.enum(['PERCENT', 'FLAT']),
    value: z.number(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    startTime: z.string().optional(), // HH:MM
    endTime: z.string().optional(),   // HH:MM
    daysOfWeek: z.string().optional(), // "0,1,2"
});

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

        const surcharge = await prisma.surcharge.create({
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

        return NextResponse.json(surcharge, { status: 201 });
    } catch (error) {
        console.error('Error creating surcharge:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
