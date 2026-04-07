import { openai } from '@ai-sdk/openai';
import { streamText, tool } from 'ai';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { z } from 'zod';

export const maxDuration = 30;

export async function OPTIONS(req: Request) {
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
            return new NextResponse('Unauthorized: Missing API Key', { status: 401 });
        }

        const tenant = await prisma.tenant.findUnique({ where: { apiKey } });

        if (!tenant || !tenant.hasWebChatAi) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        if (tenant.aiMessageCount >= tenant.aiMessageLimit) {
            return new NextResponse('I am currently unavailable due to quota limits.', { status: 200 });
        }

        await prisma.tenant.update({
            where: { id: tenant.id },
            data: { aiMessageCount: { increment: 1 } }
        });

        const { messages } = await req.json();

        const systemPrompt = `
You are CABAI, the Premium AI Booking Assistant & Customer Support Agent for ${tenant.name}.
Your goal is to help customers quickly and politely, and to CREATE ACTUAL BOOKINGS in the system using your tools.

CRITICAL RULES FOR BOOKING A TAXI:
1. You MUST NEVER say "Your taxi is booked" or "I have booked your taxi" unless you have successfully called the \`submitBookingRequest\` tool and it returned success.
2. Before you can call the \`submitBookingRequest\` tool, you MUST collect ALL of the following mandatory information from the user:
   - Full Name
   - Phone Number
   - Email Address
   - Exact Pickup Location
   - Exact Dropoff Destination
   - Date and Time of the requested journey
   - Number of Passengers
   - Number of Luggage bags
   - Flight Number (ONLY IF the pickup or dropoff is an Airport, otherwise omit)
3. Do NOT ask for all of this in one overwhelming message. Ask conversationally.
4. Once you have collected ALL required details, summarize the journey for them and ask: "Shall I go ahead and submit this booking request to our dispatch team?"
5. ONLY if they say yes, you MUST call the \`submitBookingRequest\` tool.
6. After calling the tool, tell them: "Success! I have submitted your booking request to our dispatch team. A human operator will text/email you shortly with your exact price quote and driver confirmation!"

If you don't know the answer to a question, apologize and say: "I will connect you to our human dispatcher, please wait."
Never mention that you are an AI model. You are CABAI.
`;

        const result = streamText({
            model: openai('gpt-4o-mini'),
            system: systemPrompt,
            messages: messages,
            tools: {
                submitBookingRequest: tool({
                    description: 'Submit a new taxi booking request to the dispatch console. ONLY call this when all mandatory fields are collected and the user has confirmed the summary.',
                    parameters: z.object({
                        passengerName: z.string().describe('Full name of the passenger'),
                        passengerPhone: z.string().describe('Phone number of the passenger'),
                        passengerEmail: z.string().describe('Email address of the passenger'),
                        pickupAddress: z.string().describe('Exact pickup location'),
                        dropoffAddress: z.string().describe('Exact dropoff location'),
                        pickupTimeISO: z.string().describe('ISO 8601 formatted date and time for the pickup (e.g. 2026-04-10T14:30:00Z)'),
                        passengers: z.number().describe('Number of passengers'),
                        luggage: z.number().describe('Number of luggage bags'),
                        flightNumber: z.string().optional().describe('Flight number if airport transfer'),
                    }),
                    execute: async ({ passengerName, passengerPhone, passengerEmail, pickupAddress, dropoffAddress, pickupTimeISO, passengers, luggage, flightNumber }) => {
                        
                        try {
                            // Upsert Customer
                            const customer = await prisma.customer.upsert({
                                where: { 
                                    tenantId_phone: { tenantId: tenant.id, phone: passengerPhone }
                                },
                                update: { name: passengerName, email: passengerEmail },
                                create: {
                                    tenantId: tenant.id,
                                    phone: passengerPhone,
                                    name: passengerName,
                                    email: passengerEmail
                                }
                            });

                            // Create Job without a fare, dispatchers will quote it manually
                            const job = await prisma.job.create({
                                data: {
                                    tenantId: tenant.id,
                                    customerId: customer.id,
                                    passengerName,
                                    passengerPhone,
                                    pickupAddress,
                                    dropoffAddress,
                                    pickupTime: new Date(pickupTimeISO),
                                    passengers,
                                    luggage,
                                    flightNumber,
                                    status: 'PENDING',
                                    paymentType: 'CASH',
                                    autoDispatch: false,
                                    notes: 'Submitted via Web Chat AI (CABAI). Price needs confirming.'
                                }
                            });
                            
                            return { success: true, jobId: job.id, message: 'Booking request successfully submitted to dispatch console.' };
                        } catch (e) {
                            return { success: false, error: 'Database error while submittting booking.' };
                        }
                    }
                })
            }
        });

        const response = result.toTextStreamResponse();

        response.headers.set('Access-Control-Allow-Origin', '*');
        response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
        response.headers.set('Access-Control-Allow-Headers', 'Content-Type, x-api-key');

        return response;

    } catch (error) {
        console.error("[WIDGET_CHAT_ERROR]", error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
