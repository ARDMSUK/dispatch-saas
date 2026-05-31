import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { broadcastOperatorPresence } from '@/lib/supabase-broadcast';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id || !session?.user?.tenantId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { status } = body;

        const validStatuses = ['ONLINE', 'AWAY', 'BUSY', 'OFFLINE'];
        if (!status || !validStatuses.includes(status)) {
            return NextResponse.json({ error: 'Invalid or missing presence status' }, { status: 400 });
        }

        // Update User Model
        const updatedUser = await prisma.user.update({
            where: { id: session.user.id },
            data: {
                presenceStatus: status,
                lastPresenceUpdate: new Date()
            },
            select: {
                id: true,
                name: true,
                sipExtension: true,
                presenceStatus: true
            }
        });

        // Trigger Broadcast
        await broadcastOperatorPresence({
            userId: updatedUser.id,
            name: updatedUser.name,
            sipExtension: updatedUser.sipExtension,
            status: updatedUser.presenceStatus
        });

        return NextResponse.json({ success: true, presenceStatus: updatedUser.presenceStatus });
    } catch (error) {
        console.error('Presence Update Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
