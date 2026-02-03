import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { auth } from '@/auth';

export const dynamic = 'force-dynamic';

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
        const session = await auth();
        if (!session?.user?.tenantId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const body = await request.json();
        const validation = UpdateVehicleSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json({ error: 'Invalid data', details: validation.error }, { status: 400 });
        }

        const { reg, make, model, color, type, expiryDate, driverId } = validation.data;

        // Ensure the vehicle belongs to the tenant
        const existingVehicle = await prisma.vehicle.findUnique({
            where: { id, tenantId: session.user.tenantId }
        });

        if (!existingVehicle) {
            return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
        }

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
