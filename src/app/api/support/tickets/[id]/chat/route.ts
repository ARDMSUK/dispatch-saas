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

        // 2. The *latest* message in the array is the one the user just typed (or a reload).
        // We must save it to the database immediately so human admins have a record,
        // but only if it doesn't already exist.
        const latestMessage = messages[messages.length - 1];
        if (latestMessage.role === 'user') {
            // Because useChat might generate custom IDs, we use the message content & ticket to find duplicates for recent messages.
            // Or, simply check by ID if it matches a cuid length
            let existingMsg = null;
            if (latestMessage.id && latestMessage.id.length > 10) {
                existingMsg = await prisma.ticketMessage.findUnique({
                    where: { id: latestMessage.id }
                });
            }
            
            if (!existingMsg) {
                await prisma.ticketMessage.create({
                    data: {
                        id: latestMessage.id && latestMessage.id.length > 10 ? latestMessage.id : undefined,
                        ticketId: ticketId,
                        senderType: 'TENANT_USER',
                        senderId: session.user.id,
                        content: latestMessage.content
                    }
                });
            }
        }

        // 3. Fetch Dynamic Knowledge Base Rules
        const dynamicRules = await prisma.aiKnowledgeRule.findMany({
            where: { isActive: true }
        });
        const rulesText = dynamicRules.length > 0 
            ? dynamicRules.map(r => `- ${r.topic}: ${r.content}`).join('\\n')
            : "No dynamic rules configured.";

        // Current UK time for working hours logic
        const now = new Date();
        const formatter = new Intl.DateTimeFormat('en-GB', { 
            timeZone: 'Europe/London', 
            weekday: 'long', 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: false
        });
        const currentUkTime = formatter.format(now);

        // 4. Define the System Prompt for the AI
        const systemPrompt = `
You are CABAI, the Level 1 Support AI for the Dispatch SaaS platform.
You are helping a Tenant Administrator or Dispatcher.
Your goal is to answer their technical or billing questions quickly and politely.

Core Knowledge Base (Dynamic):
${rulesText}

Fallback Hardcoded Rules (Use only if not contradicted by above):
- Web Booker: To enable the Web Booker, the user must add a Google Maps API Key in their Dashboard Settings.
- Pricing Zones: Fixed pricing overrides standard distance calculations. They are configured in the Zones tab.
- Billing: The system uses Stripe for subscriptions. If their account locks, they must visit the Billing tab to update their card.
- Cron Jobs: Flight tracking and recurring bookings run automatically in the background.

Operating Hours & Escalation Protocol:
- The current UK time is ${currentUkTime}.
- Human live support is available ONLY Monday to Friday, 09:00 to 17:00 UK Time.
- If the user asks a question you CANNOT answer, or explicitly asks for a human, reply with exactly: "ESCALATING TO HUMAN".
- IF you escalate, AND the current time is outside of the human live support hours, you MUST append a polite message explaining that our human support team is currently offline and will review their ticket on the next working day.

Rules:
1. Be concise, professional, and helpful.
2. Never invent features that don't exist.
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

                    // We wrap the email sending in a try/catch so it doesn't crash the onFinish handler
                    try {
                        const { sendEmail, getSupportEscalationEmail } = await import('@/lib/email');
                        const html = getSupportEscalationEmail(ticket.id, ticket.tenant.slug, ticket.subject);
                        await sendEmail("support@cabai.co.uk", `Escalated Ticket [${ticket.id.slice(-8)}] - ${ticket.tenant.slug}`, html);
                        
                        // Twilio SMS Notification to Super Admin
                        if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.SUPPORT_PHONE_NUMBER) {
                            const twilio = (await import('twilio')).default;
                            const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
                            await client.messages.create({
                                body: `URGENT: Support ticket escalated by ${ticket.tenant.name}. Subject: ${ticket.subject}. Ticket ID: ${ticket.id.slice(-8)}`,
                                from: process.env.TWILIO_FROM_NUMBER || '+447000000000',
                                to: process.env.SUPPORT_PHONE_NUMBER
                            });
                        }
                    } catch (e) {
                        console.error("Failed to send escalation email/SMS:", e);
                    }
                } else {
                    // Otherwise mark as answered
                    await prisma.ticket.update({
                        where: { id: ticketId },
                        data: { status: 'ANSWERED' }
                    });
                }
            },
        });

        // 5. Send the stream back directly to the client (using correct UI Message stream format)
        return result.toUIMessageStreamResponse();

    } catch (error: any) {
        console.error("AI Chat Route Error:", error);
        return new Response(JSON.stringify({ error: error.message, stack: error.stack }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
}
