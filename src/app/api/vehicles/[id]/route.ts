
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const UpdateVehicleSchema = z.object({
    reg: z.string().min(1).optional(),
    make: z.string().min(1).optional(),
    model: z.string().min(1).optional(),
    color: z.string().optional().or(z.literal('')),
    type: z.string().default('Saloon').optional(),
    expiryDate: z.string().datetime().optional().or(z.literal('')), // ISO string
    driverId: z.string().optional().nullable(),
});

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();
        const validation = UpdateVehicleSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json({ error: 'Invalid data', details: validation.error }, { status: 400 });
        }

        const tenant = await prisma.tenant.findUnique({ where: { slug: 'demo-cabs' } });
        if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });

        const { reg, make, model, color, type, expiryDate, driverId } = validation.data;

        const updatedVehicle = await prisma.vehicle.update({
            where: { id },
            data: {
                reg,
                make,
                model,
                color,
                type,
                expiryDate,
                driverId
            }
        });

        return NextResponse.json(updatedVehicle);
    } catch (error) {
        console.error('Error updating vehicle:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        await prisma.vehicle.delete({
            where: { id }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting vehicle:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
