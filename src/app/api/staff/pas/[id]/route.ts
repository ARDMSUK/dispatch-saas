import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export const dynamic = 'force-dynamic';

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
    try {
        const session = await auth();
        if (!session?.user?.tenantId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { name, callsign, phone, email, gender, status, payRatePerHour } = body;

        // Verify ownership
        const pa = await prisma.passengerAssistant.findUnique({
            where: { id: params.id }
        });

        if (!pa || pa.tenantId !== session.user.tenantId) {
            return NextResponse.json({ error: 'PA not found or access denied' }, { status: 403 });
        }

        // If callsign changes, verify uniqueness
        if (callsign && callsign !== pa.callsign) {
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
        }

        const updatedPa = await prisma.passengerAssistant.update({
            where: { id: params.id },
            data: {
                name: name !== undefined ? name : undefined,
                callsign: callsign !== undefined ? callsign : undefined,
                phone: phone !== undefined ? phone : undefined,
                email: email !== undefined ? email : undefined,
                gender: gender !== undefined ? gender : undefined,
                status: status !== undefined ? status : undefined,
                payRatePerHour: payRatePerHour !== undefined ? parseFloat(payRatePerHour) : undefined,
            }
        });

        return NextResponse.json(updatedPa);
    } catch (error) {
        console.error('Failed to update PA:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
    try {
        const session = await auth();
        if (!session?.user?.tenantId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Verify ownership
        const pa = await prisma.passengerAssistant.findUnique({
            where: { id: params.id }
        });

        if (!pa || pa.tenantId !== session.user.tenantId) {
            return NextResponse.json({ error: 'PA not found or access denied' }, { status: 403 });
        }

        await prisma.passengerAssistant.delete({
            where: { id: params.id }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Failed to delete PA:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
