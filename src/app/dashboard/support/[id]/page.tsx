import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import TicketChatClient from "@/components/dashboard/ticket-chat-client";

export default async function TicketPage({ params }: { params: Promise<{ id: string }> }) {
    const session = await auth();
    if (!session || !session.user) redirect('/login');

    const resolvedParams = await params;
    const ticketId = resolvedParams.id;
    const tenantId = session.user.tenantId;

    // Fetch the ticket and its message history
    const ticket = await prisma.ticket.findUnique({
        where: { id: ticketId, tenantId },
        include: {
            messages: {
                orderBy: { createdAt: 'asc' },
                include: { user: true }
            }
        }
    });

    if (!ticket) {
        notFound();
    }

    // Map Prisma messages to Vercel AI SDK format
    const initialMessages = ticket.messages.map((msg) => ({
        id: msg.id,
        role: msg.senderType === 'TENANT_USER' ? 'user' : (msg.senderType === 'SYSTEM_ADMIN' ? 'assistant' : 'assistant'),
        content: msg.content,
        // Optional tracking if a human admin replied vs AI
        name: msg.senderType === 'SYSTEM_ADMIN' ? 'Human Support' : (msg.senderType === 'AI_AGENT' ? 'Cabot AI' : undefined)
    }));

    return (
        <div className="flex-1 p-8 pt-6 bg-zinc-950 min-h-screen text-white h-[calc(100vh-4rem)] flex flex-col">
            <TicketChatClient
                ticketId={ticket.id}
                subject={ticket.subject}
                status={ticket.status}
                initialMessages={initialMessages as any}
            />
        </div>
    );
}
