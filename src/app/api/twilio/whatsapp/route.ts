import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import twilio from 'twilio';

// Allow 30s max duration for Vercel functions to allow AI time to respond
export const maxDuration = 30;

export async function POST(req: Request) {
    try {
        const text = await req.text();
        const params = new URLSearchParams(text);

        const from = params.get('From'); // e.g. "whatsapp:+1234567890"
        const to = params.get('To'); // e.g. "whatsapp:+0987654321"
        const body = params.get('Body') || '';
        const profileName = params.get('ProfileName') || 'Customer';

        if (!from || !to) {
            return new NextResponse('Missing From or To', { status: 400 });
        }

        // Twilio sends "To" format: whatsapp:+447....
        // Tenant db might store "+447..." or "whatsapp:+447..." 
        const cleanTo = to.replace('whatsapp:', '');

        let tenant = await prisma.tenant.findFirst({
            where: {
                OR: [
                    { twilioFromNumber: to },
                    { twilioFromNumber: cleanTo },
                    { twilioFromNumber: `+${cleanTo.replace('+', '')}` }
                ],
                hasWhatsAppAi: true
            }
        });

        const twiml = new twilio.twiml.MessagingResponse();

        if (!tenant) {
            twiml.message("Sorry, this number is not configured for the AI Booking Agent.");
            return new NextResponse(twiml.toString(), {
                headers: { 'Content-Type': 'text/xml' }
            });
        }

        const userPhone = from.replace('whatsapp:', '');

        // Fetch or create conversation session
        let session = await prisma.whatsappSession.findUnique({
            where: {
                tenantId_userPhone: {
                    tenantId: tenant.id,
                    userPhone: userPhone
                }
            }
        });

        if (!session) {
            session = await prisma.whatsappSession.create({
                data: {
                    tenantId: tenant.id,
                    userPhone: userPhone,
                    messages: []
                }
            });
        }

        // Parse existing message history
        const messages = Array.isArray(session.messages) ? session.messages as any[] : [];
        const userMessage = { role: 'user', content: body };
        messages.push(userMessage);

        const systemPrompt = `
You are the AI Booking Assistant for ${tenant.name}.
Respond concisely via WhatsApp to help the user book a taxi.
Ask for pickup, dropoff, date, time, passengers, and luggage if they want to book.
Never mention you are an AI model. Address the user politely, their WhatsApp profile name is ${profileName}.
Keep formatting mobile-friendly (use simple lists or emojis, no complex markdown).
If they ask for a human, apologize and state you will flag their request for a human dispatcher.
`;

        // Generate response
        const { text: aiResponse } = await generateText({
            model: openai('gpt-4o-mini'),
            system: systemPrompt,
            messages: messages,
            temperature: 0.7
        });

        const assistantMessage = { role: 'assistant', content: aiResponse };
        messages.push(assistantMessage);

        // Update DB History
        await prisma.whatsappSession.update({
            where: { id: session.id },
            data: { messages: messages }
        });

        twiml.message(aiResponse);

        return new NextResponse(twiml.toString(), {
            headers: { 'Content-Type': 'text/xml' }
        });

    } catch (error) {
        console.error('[TWILIO_WHATSAPP_ERROR]', error);

        // Return a safe fallback twiml if the AI fails
        const twiml = new twilio.twiml.MessagingResponse();
        twiml.message("We're currently experiencing a system delay. Please try again shortly.");

        return new NextResponse(twiml.toString(), {
            headers: { 'Content-Type': 'text/xml' }
        });
    }
}
