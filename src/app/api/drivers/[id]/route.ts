
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const UpdateDriverSchema = z.object({
    name: z.string().min(1).optional(),
    callsign: z.string().min(1).optional(),
    phone: z.string().min(1).optional(),
    email: z.string().email().optional().or(z.literal('')),
    badgeNumber: z.string().optional().or(z.literal('')),
    licenseExpiry: z.string().datetime().optional().or(z.literal('')), // ISO string
    pin: z.string().optional().or(z.literal('')),
});

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();
        const validation = UpdateDriverSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json({ error: 'Invalid data', details: validation.error }, { status: 400 });
        }

        const tenant = await prisma.tenant.findUnique({ where: { slug: 'demo-cabs' } });
        if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });

        // Check if driver exists
        const existingDriver = await prisma.driver.findUnique({
            where: { id }
        });

        if (!existingDriver) {
            return NextResponse.json({ error: 'Driver not found' }, { status: 404 });
        }

        const { name, callsign, phone, email, badgeNumber, licenseExpiry, pin } = validation.data;

        // specific check for callsign uniqueness if it's being updated
        if (callsign && callsign !== existingDriver.callsign) {
            const duplicate = await prisma.driver.findFirst({
                where: { tenantId: tenant.id, callsign }
            });
            if (duplicate) {
                return NextResponse.json({ error: 'Callsign already exists' }, { status: 409 });
            }
        }

        const updatedDriver = await prisma.driver.update({
            where: { id },
            data: {
                name,
                callsign,
                phone,
                email,
                badgeNumber,
                licenseExpiry,
                pin
            }
        });

        return NextResponse.json(updatedDriver);
    } catch (error) {
        console.error('Error updating driver:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const tenant = await prisma.tenant.findUnique({ where: { slug: 'demo-cabs' } });

        if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });

        // Optional: Check for active jobs or dependencies before delete
        // For now, we allow delete.

        await prisma.driver.delete({
            where: { id }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting driver:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
