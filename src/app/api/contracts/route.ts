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

        const contracts = await prisma.contract.findMany({
            where: { tenantId: session.user.tenantId },
            include: { account: true, routes: true },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json(contracts);
    } catch (error) {
        console.error('Failed to fetch contracts:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
