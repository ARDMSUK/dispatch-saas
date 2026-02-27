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

        // Fetch all currently ringing calls aimed at this tenant's dispatch
        const activeCalls = await prisma.incomingCall.findMany({
            where: {
                tenantId,
                status: 'RINGING'
            },
            orderBy: {
                createdAt: 'asc' // Oldest ringing first
            }
        });

        return NextResponse.json(activeCalls);
    } catch (error) {
        console.error('Failed to fetch active calls', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
