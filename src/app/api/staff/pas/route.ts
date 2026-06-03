import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const session = await auth();
        if (!session?.user?.tenantId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const pas = await prisma.passengerAssistant.findMany({
            where: { tenantId: session.user.tenantId },
            orderBy: { name: 'asc' }
        });

        return NextResponse.json(pas);
    } catch (error) {
        console.error('Failed to fetch PAs:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const session = await auth();
        if (!session?.user?.tenantId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { name, callsign, phone, email, gender, status, payRatePerHour } = body;

        if (!name || !callsign || !phone) {
            return NextResponse.json({ error: 'Name, Callsign, and Phone are required' }, { status: 400 });
        }

        // Check if callsign is unique for tenant
        const existing = await prisma.passengerAssistant.findUnique({
            where: {
                tenantId_callsign: {
                    tenantId: session.user.tenantId,
                    callsign
                }
            }
        });

        if (existing) {
            return NextResponse.json({ error: 'PA callsign already exists for this tenant' }, { status: 409 });
        }

        const pa = await prisma.passengerAssistant.create({
            data: {
                tenantId: session.user.tenantId,
                name,
                callsign,
                phone,
                email: email || null,
                gender: gender || null,
                status: status || 'OFF_DUTY',
                payRatePerHour: payRatePerHour !== undefined ? parseFloat(payRatePerHour) : 11.44
            }
        });

        return NextResponse.json(pa, { status: 201 });
    } catch (error) {
        console.error('Failed to create PA:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
