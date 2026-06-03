import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const session = await auth();

        if (!session?.user?.tenantId || session.user.role !== 'B2B_ADMIN' || !session.user.accountId) {
            return NextResponse.json({ error: 'Unauthorized B2B Access' }, { status: 401 });
        }

        const tenantId = session.user.tenantId;
        const accountId = session.user.accountId;

        const invoices = await prisma.invoice.findMany({
            where: {
                tenantId,
                accountId
            },
            orderBy: {
                issueDate: 'desc'
            }
        });

        // Safe serialization for BigInt if any
        return new NextResponse(JSON.stringify(invoices, (_, v) => typeof v === 'bigint' ? v.toString() : v), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('Failed to fetch B2B invoices:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
