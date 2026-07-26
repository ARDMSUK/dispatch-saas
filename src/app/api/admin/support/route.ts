import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { requireSuperAdmin } from "@/utils/rbac";

export async function GET(request: Request) {
    try {
        const session = await auth();
    const { error: rbacError } = await requireSuperAdmin();
    if (rbacError) return rbacError;
        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');

        const whereClause: any = {};
        if (status && status !== 'ALL') {
            whereClause.status = status;
        }

        const tickets = await prisma.ticket.findMany({
            where: whereClause,
            include: {
                tenant: { select: { name: true, slug: true } },
                _count: { select: { messages: true } },
                messages: {
                    orderBy: { createdAt: 'desc' },
                    take: 1
                }
            },
            orderBy: { updatedAt: 'desc' }
        });

        return NextResponse.json(tickets);
    } catch (error) {
        console.error('[ADMIN_SUPPORT_GET]', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}
