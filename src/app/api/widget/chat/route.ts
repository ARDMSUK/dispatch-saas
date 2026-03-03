import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const maxDuration = 30;

export async function OPTIONS(req: Request) {
    // Handle CORS preflight aggressively for external widgets
    return new NextResponse(null, {
        status: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, x-api-key',
        },
    });
}

export async function POST(req: Request) {
    try {
        const apiKey = req.headers.get('x-api-key');

        if (!apiKey) {
            return new NextResponse('Unauthorized: Missing API Key', {
                status: 401,
                headers: { 'Access-Control-Allow-Origin': '*' }
            });
        }

        const tenant = await prisma.tenant.findUnique({
            where: { apiKey }
        });

        if (!tenant) {
            return new NextResponse('Unauthorized: Invalid API Key', {
                status: 401,
                headers: { 'Access-Control-Allow-Origin': '*' }
            });
        }

        if (!tenant.hasWebChatAi) {
            return new NextResponse('Forbidden: Web Chat AI feature is not enabled for this account.', {
                status: 403,
                headers: { 'Access-Control-Allow-Origin': '*' }
            });
        }

        const { messages } = await req.json();

        const systemPrompt = `
You are the AI Booking Assistant & Customer Support Agent for ${tenant.name}.
Your goal is to help customers quickly and politely. 

If they want to book a taxi:
1. Ask for their pickup location, dropoff destination, date, and time.
2. Ask for passenger count and if they have luggage.
3. Once you have all details, confirm the summary back to them.

If you don't know the answer to a question (e.g. precise real-time driver tracking), apologize and offer to connect them to human dispatch by saying exactly: "I will connect you to our human dispatcher, please wait."

Rules:
- Keep your answers concise, friendly, and well formatted.
- Never mention that you are an AI model created by OpenAI. Introduce yourself simply as ${tenant.name}'s virtual assistant.
`;

        const result = streamText({
            model: openai('gpt-4o-mini'),
            system: systemPrompt,
            messages: messages,
            async onFinish({ text }) {
                // In future expansions, we can log this conversation to a Lead/ChatHistory table linking to the tenantId
            }
        });

        const response = result.toTextStreamResponse();

        // Ensure CORS headers are firmly attached to the streaming response chunks
        response.headers.set('Access-Control-Allow-Origin', '*');
        response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
        response.headers.set('Access-Control-Allow-Headers', 'Content-Type, x-api-key');

        return response;

    } catch (error) {
        console.error("[WIDGET_CHAT_ERROR]", error);
        return new NextResponse('Internal Server Error', {
            status: 500,
            headers: { 'Access-Control-Allow-Origin': '*' }
        });
    }
}
