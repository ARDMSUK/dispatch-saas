import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const CreateAccountSchema = z.object({
    code: z.string().min(1),
    name: z.string().min(1),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    address: z.string().optional(),
    notes: z.string().optional(),
});

export async function GET() {
    try {
        const tenant = await prisma.tenant.findUnique({
            where: { slug: 'demo-cabs' }
        });

        if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });

        const accounts = await prisma.account.findMany({
            where: {
                tenantId: tenant.id
            },
            include: {
                customers: true,
                _count: {
                    select: { jobs: true }
                }
            },
            orderBy: {
                name: 'asc'
            }
        });

        return NextResponse.json(accounts);
    } catch (error) {
        console.error('Error fetching accounts:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const validation = CreateAccountSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json({ error: 'Invalid data', details: validation.error }, { status: 400 });
        }

        const tenant = await prisma.tenant.findUnique({ where: { slug: 'demo-cabs' } });
        if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });

        const { code, name, email, phone, address, notes } = validation.data;

        // Check uniqueness
        const existing = await prisma.account.findUnique({
            where: {
                tenantId_code: {
                    tenantId: tenant.id,
                    code
                }
            }
        });

        if (existing) {
            return NextResponse.json({ error: 'Account code already exists' }, { status: 409 });
        }

        const newAccount = await prisma.account.create({
            data: {
                tenantId: tenant.id,
                code,
                name,
                email,
                phone,
                address,
                notes
            }
        });

        return NextResponse.json(newAccount, { status: 201 });
    } catch (error) {
        console.error('Error creating account:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
