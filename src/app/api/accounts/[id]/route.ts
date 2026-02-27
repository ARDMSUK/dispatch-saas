
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { auth } from '@/auth';

export const dynamic = 'force-dynamic';

const UpdateAccountSchema = z.object({
    code: z.string().min(1).optional(),
    name: z.string().min(1).optional(),
    email: z.string().email().optional().or(z.literal('')),
    phone: z.string().optional().or(z.literal('')),

    // New Contact Fields
    contactName: z.string().optional().or(z.literal('')),
    contactJobTitle: z.string().optional().or(z.literal('')),
    department: z.string().optional().or(z.literal('')),

    // New Address Fields
    addressLine1: z.string().optional().or(z.literal('')),
    addressLine2: z.string().optional().or(z.literal('')),
    townCity: z.string().optional().or(z.literal('')),
    postcode: z.string().optional().or(z.literal('')),

    // Billing and Accounts Payable
    isAuthorisedToSetAccount: z.boolean().optional(),
    apContact: z.string().optional().or(z.literal('')),
    apPhone: z.string().optional().or(z.literal('')),
    apEmail: z.string().email().optional().or(z.literal('')),
    paymentTerms: z.string().optional().or(z.literal('')),

    // Contract
    startDate: z.string().datetime().optional().nullable(),
    endDate: z.string().datetime().optional().nullable(),

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

        const session = await auth();
        if (!session?.user?.tenantId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const tenantId = session.user.tenantId;

        const { code, ...updateData } = validation.data;

        // Check uniqueness if code is changing
        if (code) {
            const existing = await prisma.account.findUnique({
                where: {
                    tenantId_code: {
                        tenantId: tenantId,
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
                ...updateData
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

        const session = await auth();
        if (!session?.user?.tenantId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Verify ownership
        const existing = await prisma.account.findUnique({ where: { id } });
        if (!existing || existing.tenantId !== session.user.tenantId) {
            return NextResponse.json({ error: 'Account not found' }, { status: 404 });
        }

        await prisma.account.delete({
            where: { id }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting account:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
