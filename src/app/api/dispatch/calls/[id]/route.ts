import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from "@/auth";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
    try {
        const session = await auth();
        if (!session?.user?.tenantId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const tenantId = session.user.tenantId;

        const body = await req.json();
        const { status } = body; // Expecting 'ANSWERED' or 'DISMISSED'

        if (status !== 'ANSWERED' && status !== 'DISMISSED') {
            return NextResponse.json({ error: 'Invalid status update' }, { status: 400 });
        }

        const call = await prisma.incomingCall.findUnique({
            where: { id: params.id }
        });

        if (!call || call.tenantId !== tenantId) {
            return NextResponse.json({ error: 'Call not found' }, { status: 404 });
        }

        const updatedCall = await prisma.incomingCall.update({
            where: { id: params.id },
            data: { status }
        });

        return NextResponse.json(updatedCall);
    } catch (error) {
        console.error('Error updating call status', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
