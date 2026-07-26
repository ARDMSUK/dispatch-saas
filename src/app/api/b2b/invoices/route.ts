import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { requireB2BAccountScope } from "@/utils/rbac";

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const session = await auth();

        const { error: rbacError, accountId, tenantId } = await requireB2BAccountScope();
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
