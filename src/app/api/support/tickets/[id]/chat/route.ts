import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

// Ensure the Edge Runtime or Node runtime is capable of streaming. Node is fine.
export const maxDuration = 30;

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await auth();

        if (!session || !session.user) {
            return new Response('Unauthorized', { status: 401 });
        }

        const resolvedParams = await params;
        const ticketId = resolvedParams.id;
        const tenantId = session.user.tenantId;

        // Extract the messages from the frontend useChat() hook
        const { messages } = await req.json();

        // 1. Verify ticket ownership
        const ticket = await prisma.ticket.findUnique({
            where: { id: ticketId, tenantId: tenantId },
            include: { tenant: true }
        });

        if (!ticket) {
            return new Response('Ticket not found or unauthorized', { status: 404 });
        }

        // 2. The *latest* message in the array is the one the user just typed. 
        // We must save it to the database immediately so human admins have a record.
        const latestMessage = messages[messages.length - 1];
        if (latestMessage.role === 'user') {
            await prisma.ticketMessage.create({
                data: {
                    ticketId: ticketId,
                    senderType: 'TENANT_USER',
                    senderId: session.user.id,
                    content: latestMessage.content
                }
            });
        }

        // 3. Define the System Prompt for the AI
        const systemPrompt = `
You are Cabot, the Level 1 Support AI for the Dispatch SaaS platform.
You are helping a Tenant Administrator or Dispatcher.
Your goal is to answer their technical or billing questions quickly and politely.

Core Knowledge Base:
- Web Booker: To enable the Web Booker, the user must add a Google Maps API Key in their Dashboard Settings.
- Pricing Zones: Fixed pricing overrides standard distance calculations. They are configured in the Zones tab.
- Billing: The system uses Stripe for subscriptions. If their account locks, they must visit the Billing tab to update their card.
- Cron Jobs: Flight tracking and recurring bookings run automatically in the background.

Rules:
1. Be concise, professional, and helpful.
2. If the user asks a question you CANNOT answer with absolute certainty, or if they explicitly ask for a human, reply with exactly the phrase: "ESCALATING TO HUMAN". 
3. Never invent features that don't exist.
`;

        // 4. Stream the text from OpenAI
        const result = streamText({
            model: openai('gpt-4o-mini'),
            system: systemPrompt,
            messages: messages,
            async onFinish({ text }) {
                // When the AI finishes typing, save its response to the database
                await prisma.ticketMessage.create({
                    data: {
                        ticketId: ticketId,
                        senderType: 'AI_AGENT',
                        content: text
                    }
                });

                // If the AI decided to escalate, update the ticket status
                if (text.includes("ESCALATING TO HUMAN")) {
                    await prisma.ticket.update({
                        where: { id: ticketId },
                        data: { status: 'ESCALATED' }
                    });

                    const { sendEmail, getSupportEscalationEmail } = await import('@/lib/email');
                    const html = getSupportEscalationEmail(ticket.id, ticket.tenant.slug, ticket.subject);
                    await sendEmail("support@cabai.co.uk", `Escalated Ticket [${ticket.id.slice(-8)}] - ${ticket.tenant.slug}`, html);
                } else {
                    // Otherwise mark as answered
                    await prisma.ticket.update({
                        where: { id: ticketId },
                        data: { status: 'ANSWERED' }
                    });
                }
            },
        });

        // 5. Send the stream back directly to the client
        return result.toTextStreamResponse();

    } catch (error) {
        console.error("AI Chat Route Error:", error);
        return new Response('Internal Server Error', { status: 500 });
    }
}
