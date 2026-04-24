
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { auth } from '@/auth';

export const dynamic = 'force-dynamic';

const UpdateDriverSchema = z.object({
    name: z.string().min(1).optional(),
    callsign: z.string().min(1).optional(),
    phone: z.string().min(1).optional(),
    email: z.string().email().optional().or(z.literal('')),
    badgeNumber: z.string().optional().or(z.literal('')),
    licenseExpiry: z.string().datetime().optional().or(z.literal('')), // ISO string
    pin: z.string().optional().or(z.literal('')),
    commissionRate: z.number().optional(),
    complianceOverrideActive: z.boolean().optional(),
    complianceOverrideReason: z.string().optional().nullable()
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

        const session = await auth();
        if (!session?.user?.tenantId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const tenantId = session.user.tenantId;

        // Check if driver exists
        const existingDriver = await prisma.driver.findUnique({
            where: { id }
        });

        if (!existingDriver) {
            return NextResponse.json({ error: 'Driver not found' }, { status: 404 });
        }

        const { name, callsign, phone, email, badgeNumber, licenseExpiry, pin, commissionRate, complianceOverrideActive, complianceOverrideReason } = validation.data;

        // specific check for callsign uniqueness if it's being updated
        if (callsign && callsign !== existingDriver.callsign) {
            const duplicate = await prisma.driver.findFirst({
                where: { tenantId: tenantId, callsign }
            });
            if (duplicate) {
                return NextResponse.json({ error: 'Callsign already exists' }, { status: 409 });
            }
        }

        const dataToUpdate: any = {
            name,
            callsign,
            phone,
            email,
            badgeNumber,
            licenseExpiry,
            pin,
            commissionRate
        };

        if (complianceOverrideActive !== undefined) {
            if (session.user.role === 'ADMIN' || session.user.role === 'SUPER_ADMIN') {
                dataToUpdate.complianceOverrideActive = complianceOverrideActive;
                dataToUpdate.complianceOverrideReason = complianceOverrideReason;
            } else {
                return NextResponse.json({ error: 'Forbidden: Only admins can override compliance' }, { status: 403 });
            }
        }

        const updatedDriver = await prisma.driver.update({
            where: { id },
            data: dataToUpdate
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
        const session = await auth();
        if (!session?.user?.tenantId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        // const tenantId = session.user.tenantId; // Not strictly needed for delete if ID is unique, but good for ownership check?
        // Actually driver IDs are CUIDs so unique globaly, but we should verify ownership.

        const existingDriver = await prisma.driver.findUnique({ where: { id } });
        if (!existingDriver || existingDriver.tenantId !== session.user.tenantId) {
            return NextResponse.json({ error: 'Driver not found or access denied' }, { status: 404 });
        }

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
