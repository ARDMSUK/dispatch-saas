import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const CreateVehicleSchema = z.object({
    reg: z.string().min(1),
    make: z.string().min(1),
    model: z.string().min(1),
    color: z.string().optional(),
    type: z.string().default('Saloon'),
    expiryDate: z.string().datetime().optional(), // ISO string
    driverId: z.string().optional(),
});

export async function GET() {
    try {
        const tenant = await prisma.tenant.findUnique({
            where: { slug: 'demo-cabs' }
        });

        if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });

        const vehicles = await prisma.vehicle.findMany({
            where: {
                tenantId: tenant.id
            },
            include: {
                driver: true
            }
        });

        return NextResponse.json(vehicles);
    } catch (error) {
        console.error('Error fetching vehicles:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const validation = CreateVehicleSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json({ error: 'Invalid data', details: validation.error }, { status: 400 });
        }

        const tenant = await prisma.tenant.findUnique({ where: { slug: 'demo-cabs' } });
        if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });

        const { reg, make, model, color, type, expiryDate, driverId } = validation.data;

        const newVehicle = await prisma.vehicle.create({
            data: {
                tenantId: tenant.id,
                reg,
                make,
                model,
                color,
                type,
                expiryDate,
                driverId
            }
        });

        return NextResponse.json(newVehicle, { status: 201 });
    } catch (error) {
        console.error('Error creating vehicle:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
