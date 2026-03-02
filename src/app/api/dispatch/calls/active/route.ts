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

        // Fetch all currently ringing calls, and recently answered calls (max 30 seconds old)
        const activeCalls = await prisma.incomingCall.findMany({
            where: {
                tenantId,
                OR: [
                    {
                        status: 'RINGING',
                        createdAt: { gte: new Date(Date.now() - 15 * 60 * 1000) } // 15 mins
                    },
                    {
                        status: 'ANSWERED',
                        updatedAt: { gte: new Date(Date.now() - 30 * 1000) } // 30 sec
                    }
                ]
            },
            orderBy: {
                createdAt: 'asc' // Oldest ringing first
            }
        });

        return NextResponse.json(activeCalls, {
            headers: {
                'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0',
            }
        });
    } catch (error) {
        console.error('Failed to fetch active calls', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
