import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { z } from 'zod';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

const CreatePortalUserSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6), // Enforce reasonable password
    name: z.string().min(1).optional()
});

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: accountId } = await params;
        const session = await auth();
        if (!session?.user?.tenantId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const tenantId = session.user.tenantId;

        // Verify account exists and belongs to this tenant
        const account = await prisma.account.findUnique({
            where: { id: accountId }
        });

        if (!account || account.tenantId !== tenantId) {
            return NextResponse.json({ error: 'Account not found' }, { status: 404 });
        }

        const body = await request.json();
        const validation = CreatePortalUserSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json({ error: 'Invalid data', details: validation.error }, { status: 400 });
        }

        const { email, password, name } = validation.data;

        // Check for existing user globally because emails must be unique in Auth
        const existingUser = await prisma.user.findUnique({
            where: { email }
        });

        if (existingUser) {
            return NextResponse.json({ error: 'User with this email already exists' }, { status: 409 });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                name: name || account.name, // Default to account name
                role: 'B2B_ADMIN',
                tenantId,
                accountId
            }
        });

        return NextResponse.json({
            id: newUser.id,
            email: newUser.email,
            name: newUser.name
        }, { status: 201 });

    } catch (error) {
        console.error('Error creating portal user:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
