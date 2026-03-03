import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export async function POST(req: Request) {
    try {
        const session = await auth();

        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { subject, initialMessage } = await req.json();

        if (!subject || !initialMessage) {
            return NextResponse.json({ error: "Subject and initial message are required" }, { status: 400 });
        }

        const tenantId = session.user.tenantId;
        const userId = session.user.id;

        // 1. Create the Ticket
        const ticket = await prisma.ticket.create({
            data: {
                tenantId: tenantId,
                subject: subject,
                status: 'PENDING_AI_REVIEW',
                messages: {
                    create: {
                        senderType: 'TENANT_USER',
                        senderId: userId,
                        content: initialMessage,
                    }
                }
            }
        });

        return NextResponse.json({
            success: true,
            ticketId: ticket.id
        }, { status: 201 });

    } catch (error) {
        console.error("Create Ticket Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
