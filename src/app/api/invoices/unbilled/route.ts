import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    try {
        const session = await auth();
        if (!session?.user?.tenantId || (session.user.role !== 'SUPERADMIN' && session.user.role !== 'DISPATCHER')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const tenantId = session.user.tenantId;
        const { searchParams } = new URL(req.url);
        const accountId = searchParams.get("accountId");

        if (!accountId) {
            return NextResponse.json({ error: 'Missing accountId parameter' }, { status: 400 });
        }

        const unbilledJobs = await prisma.job.findMany({
            where: {
                tenantId,
                accountId,
                status: 'COMPLETED',
                isBilled: false
            },
            orderBy: {
                pickupTime: 'asc'
            }
        });

        return new NextResponse(JSON.stringify(unbilledJobs, (_, v) => typeof v === 'bigint' ? v.toString() : v), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Failed to fetch unbilled jobs:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
