import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export async function GET(request: Request, { params }: { params: { id: string } }) {
    try {
        const session = await auth();
        if (!session?.user?.tenantId) {
            return new NextResponse('Unauthorized', { status: 401 });
        }
        const resolvedParams = await params;
        const ticketId = resolvedParams.id;

        const ticket = await prisma.ticket.findUnique({
            where: {
                id: ticketId,
                tenantId: session.user.tenantId
            },
            include: {
                messages: {
                    orderBy: { createdAt: 'asc' },
                    include: {
                        user: { select: { name: true } }
                    }
                }
            }
        });

        if (!ticket) return new NextResponse('Not Found', { status: 404 });

        return NextResponse.json(ticket);
    } catch (error) {
        console.error('[TENANT_TICKET_GET]', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}
