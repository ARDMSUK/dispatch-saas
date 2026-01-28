import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const CreateDriverSchema = z.object({
    name: z.string().min(1),
    callsign: z.string().min(1),
    phone: z.string().min(1),
    email: z.string().email().optional(),
    badgeNumber: z.string().optional(),
    licenseExpiry: z.string().datetime().optional(), // ISO string
    pin: z.string().optional(),
});

import { auth } from '@/auth';

export async function GET() {
    try {
        const session = await auth();
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const tenantId = session.user.tenantId;

        // Removed manual tenant lookup. Using session tenantId.
        const tenant = { id: tenantId };

        if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });

        const drivers = await prisma.driver.findMany({
            where: {
                tenantId: tenant.id
            },
            include: {
                vehicles: true
            },
            orderBy: {
                callsign: 'asc'
            }
        });

        return NextResponse.json(drivers);
    } catch (error) {
        console.error('Error fetching drivers:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const session = await auth();
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const tenantId = session.user.tenantId;

        const body = await request.json();
        const validation = CreateDriverSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json({ error: 'Invalid data', details: validation.error }, { status: 400 });
        }

        const tenant = { id: tenantId };
        if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });

        const { name, callsign, phone, email, badgeNumber, licenseExpiry, pin } = validation.data;

        // Check callsign uniqueness
        const existing = await prisma.driver.findFirst({
            where: { tenantId: tenant.id, callsign }
        });

        if (existing) {
            return NextResponse.json({ error: 'Callsign already exists' }, { status: 409 });
        }

        const newDriver = await prisma.driver.create({
            data: {
                tenantId: tenant.id,
                name,
                callsign,
                phone,
                email,
                badgeNumber,
                licenseExpiry,
                pin
            }
        });

        return NextResponse.json(newDriver, { status: 201 });
    } catch (error) {
        console.error('Error creating driver:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
