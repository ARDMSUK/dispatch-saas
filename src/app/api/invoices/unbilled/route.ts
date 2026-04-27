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
        const contractId = searchParams.get("contractId");
        const startDate = searchParams.get("startDate");
        const endDate = searchParams.get("endDate");

        if (!accountId && !contractId) {
            return NextResponse.json({ error: 'Missing accountId or contractId parameter' }, { status: 400 });
        }

        const whereClause: any = {
            tenantId,
            status: 'COMPLETED',
            isBilled: false
        };

        if (accountId) whereClause.accountId = accountId;
        if (contractId) {
            // Need to filter jobs that belong to a specific contract
            // A Job is linked to a contractRoute, which is linked to a contract
            whereClause.contractRoute = { contractId: contractId };
        }

        if (startDate && endDate) {
            whereClause.pickupTime = {
                gte: new Date(startDate),
                lte: new Date(endDate)
            };
        }

        const unbilledJobs = await prisma.job.findMany({
            where: whereClause,
            include: {
                contractRoute: true
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
