
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const UpdateAccountSchema = z.object({
    code: z.string().min(1).optional(),
    name: z.string().min(1).optional(),
    email: z.string().email().optional().or(z.literal('')),
    phone: z.string().optional().or(z.literal('')),
    address: z.string().optional().or(z.literal('')),
    notes: z.string().optional().or(z.literal('')),
    isActive: z.boolean().optional(),
});

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();
        const validation = UpdateAccountSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json({ error: 'Invalid data', details: validation.error }, { status: 400 });
        }

        const tenant = await prisma.tenant.findUnique({ where: { slug: 'demo-cabs' } });
        if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });

        const { code, name, email, phone, address, notes, isActive } = validation.data;

        // Check uniqueness if code is changing
        if (code) {
            const existing = await prisma.account.findUnique({
                where: {
                    tenantId_code: {
                        tenantId: tenant.id,
                        code
                    }
                }
            });
            // Ensure we are not finding ourselves
            if (existing && existing.id !== id) {
                return NextResponse.json({ error: 'Account code already exists' }, { status: 409 });
            }
        }

        const updatedAccount = await prisma.account.update({
            where: { id },
            data: {
                code,
                name,
                email,
                phone,
                address,
                notes,
                isActive
            }
        });

        return NextResponse.json(updatedAccount);
    } catch (error) {
        console.error('Error updating account:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        await prisma.account.delete({
            where: { id }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting account:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
