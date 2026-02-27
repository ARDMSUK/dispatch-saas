import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from "@/auth";

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    try {
        const session = await auth();
        if (!session?.user?.tenantId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const tenantId = session.user.tenantId;

        const accounts = await prisma.account.findMany({
            where: {
                tenantId,
                isActive: true
            },
            select: {
                id: true,
                name: true,
                code: true
            },
            orderBy: {
                name: 'asc'
            }
        });

        return NextResponse.json(accounts);
    } catch (error) {
        console.error('Failed to fetch accounts', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

import { z } from 'zod';

const CreateAccountSchema = z.object({
    code: z.string().min(1),
    name: z.string().min(1),
    email: z.string().email().optional().or(z.literal('')),
    phone: z.string().optional().or(z.literal('')),

    contactName: z.string().optional().or(z.literal('')),
    contactJobTitle: z.string().optional().or(z.literal('')),
    department: z.string().optional().or(z.literal('')),

    addressLine1: z.string().optional().or(z.literal('')),
    addressLine2: z.string().optional().or(z.literal('')),
    townCity: z.string().optional().or(z.literal('')),
    postcode: z.string().optional().or(z.literal('')),

    isAuthorisedToSetAccount: z.boolean().default(false),
    apContact: z.string().optional().or(z.literal('')),
    apPhone: z.string().optional().or(z.literal('')),
    apEmail: z.string().email().optional().or(z.literal('')),
    paymentTerms: z.string().optional().or(z.literal('')),

    startDate: z.string().optional().or(z.literal('')).nullable(),
    endDate: z.string().optional().or(z.literal('')).nullable(),

    isActive: z.boolean().default(true),
    notes: z.string().optional().or(z.literal('')),
});

export async function POST(req: Request) {
    try {
        const session = await auth();
        if (!session?.user?.tenantId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const tenantId = session.user.tenantId;

        const body = await req.json();
        const validation = CreateAccountSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json({ error: 'Invalid data', details: validation.error }, { status: 400 });
        }

        const data = validation.data;

        // Check if account code already exists for this tenant
        const existing = await prisma.account.findUnique({
            where: {
                tenantId_code: {
                    tenantId,
                    code: data.code
                }
            }
        });

        if (existing) {
            return NextResponse.json({ error: 'Account code already exists' }, { status: 409 });
        }

        const { startDate, endDate, ...accountData } = validation.data;

        // Parse dates for Prisma
        const startDateVal = startDate ? new Date(startDate) : null;
        const endDateVal = endDate ? new Date(endDate) : null;

        const newAccount = await prisma.account.create({
            data: {
                ...accountData,
                startDate: startDateVal,
                endDate: endDateVal,
                tenantId
            }
        });

        return NextResponse.json(newAccount, { status: 201 });
    } catch (error) {
        console.error('Failed to create account:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
