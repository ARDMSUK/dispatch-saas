import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from "@/auth";
import { revalidatePath } from 'next/cache';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await auth();
        if (!session?.user?.tenantId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const tenantId = session.user.tenantId;

        const { id } = await params;
        const body = await req.json();
        const { status } = body; // Expecting 'ANSWERED' or 'DISMISSED'

        if (status !== 'ANSWERED' && status !== 'DISMISSED') {
            return NextResponse.json({ error: 'Invalid status update' }, { status: 400 });
        }

        const call = await prisma.incomingCall.findUnique({
            where: { id }
        });

        if (!call || call.tenantId !== tenantId) {
            return NextResponse.json({ error: 'Call not found' }, { status: 404 });
        }

        const updatedCall = await prisma.incomingCall.update({
            where: { id },
            data: { status }
        });

        // Force the polling endpoint to clear its cache
        revalidatePath('/api/dispatch/calls/active');

        return NextResponse.json(updatedCall);
    } catch (error) {
        console.error('Error updating call status', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
