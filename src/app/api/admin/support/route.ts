import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export async function GET(request: Request) {
    try {
        const session = await auth();
        if (session?.user?.role !== 'SUPER_ADMIN') {
            return new NextResponse('Unauthorized', { status: 401 });
        }

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
