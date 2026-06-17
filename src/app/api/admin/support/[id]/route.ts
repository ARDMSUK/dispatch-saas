import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export async function GET(request: Request, { params }: { params: { id: string } }) {
    try {
        const session = await auth();
        if (session?.user?.role !== 'SUPER_ADMIN') {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const ticket = await prisma.ticket.findUnique({
            where: { id: params.id },
            include: {
                tenant: { select: { name: true, slug: true } },
                messages: {
                    orderBy: { createdAt: 'asc' },
                    include: {
                        user: { select: { name: true, email: true } }
                    }
                }
            }
        });

        if (!ticket) return new NextResponse('Not Found', { status: 404 });

        return NextResponse.json(ticket);
    } catch (error) {
        console.error('[ADMIN_TICKET_GET]', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
    try {
        const session = await auth();
        if (session?.user?.role !== 'SUPER_ADMIN') {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const body = await request.json();
        const { content } = body;

        if (!content) return new NextResponse('Missing content', { status: 400 });

        // Create the message from the admin
        const message = await prisma.ticketMessage.create({
            data: {
                ticketId: params.id,
                senderType: 'SYSTEM_ADMIN',
                senderId: session.user.id,
                content
            }
        });

        // Update ticket status to answered if it was pending
        await prisma.ticket.update({
            where: { id: params.id },
            data: { status: 'ANSWERED' }
        });

        return NextResponse.json(message);
    } catch (error) {
        console.error('[ADMIN_TICKET_POST]', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
    try {
        const session = await auth();
        if (session?.user?.role !== 'SUPER_ADMIN') {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const body = await request.json();
        const { status } = body;

        if (!status) return new NextResponse('Missing status', { status: 400 });

        const ticket = await prisma.ticket.update({
            where: { id: params.id },
            data: { status }
        });

        return NextResponse.json(ticket);
    } catch (error) {
        console.error('[ADMIN_TICKET_PATCH]', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}
