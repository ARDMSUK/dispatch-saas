import { openai } from '@ai-sdk/openai';
import { streamText, tool } from 'ai';
import { prisma } from '@/lib/prisma';
import { calculatePrice } from '@/lib/pricing';
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
2. Your goal is to collect all of the following requirements for a quote or booking:
   - Date of travel
   - Pickup time
   - Pickup Address, including postcode
   - Destination address
   - Number of passengers
   - Number of bags
   - Passenger Name
   - Email Address
   - Telephone No
   - Is a return journey required?
   - If a return journey is required, you must also ask for: Return journey date, Return journey time, and if it's an airport transfer, the return flight number.
3. Do NOT ask for all of this in one overwhelming message. Ask conversationally. By default, use today's date if they say 'today' (${new Date().toLocaleString('en-GB')}).
4. Once you have ALL the required pieces of information, you MUST follow this precise three-step process:
   STEP 1: Call the "calculateQuote" tool to get the mathematical estimated price based on the job details.
   STEP 2: Tell the passenger the estimated price and ask if they would like to proceed with the booking.
   STEP 3: ONLY IF they explicitly say yes and authorize the booking, call the "submitBookingRequest" tool to finalize the booking. Include the quoted fare. Do not confirm the booking until you have successfully called the submitBookingRequest tool.
5. After the tool returns success, say: "Success! Your booking is confirmed and is pending dispatch assignment."
If you don't know the answer to a question, apologize and say: "I will connect you to our human dispatcher, please wait."
Never mention that you are an AI model. You are CABAI.`;

        const result = streamText({
            model: openai('gpt-4o-mini'),
            system: systemPrompt,
            messages: messages,
            tools: {
                calculateQuote: tool({
                    description: 'Calculates the estimated price for a trip based on distance, time, and vehicle type. Call this BEFORE confirm booking.',
                    parameters: z.object({
                        pickupLocation: z.string().describe('Exact pickup location'),
                        dropoffLocation: z.string().describe('Exact dropoff location'),
                        pickupTimeISO: z.string().describe('ISO 8601 formatted date and time for the pickup'),
                        vehicleType: z.string().optional().default('Saloon').describe('Type of vehicle'),
                        isReturn: z.boolean().optional().default(false).describe('Whether this is a return trip quote')
                    }),
                    execute: async ({ pickupLocation, dropoffLocation, pickupTimeISO, vehicleType, isReturn }) => {
                        try {
                            const dateObj = new Date(pickupTimeISO);
                            const priceResult = await calculatePrice({
                                pickup: pickupLocation,
                                dropoff: dropoffLocation,
                                pickupTime: dateObj,
                                vehicleType: vehicleType,
                                companyId: tenant.id
                            });

                            let totalQuote = priceResult.price;
                            if (isReturn) {
                                totalQuote = priceResult.price * 2;
                            }

                            return { 
                                success: true, 
                                price: totalQuote,
                                breakdown: priceResult.breakdown.isFixed ? "Fixed Fare" : "Metered Fare",
                                message: `The estimated price is £${totalQuote.toFixed(2)}. Present this price to the user and ask for booking confirmation.` 
                            };
                        } catch (e: any) {
                            return { success: false, error: 'Error calculating price. ' + e.message };
                        }
                    }
                }),
                submitBookingRequest: tool({
                    description: 'Submit a new taxi booking request to the dispatch console. ONLY call this after calculateQuote was successfully accepted by user.',
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
                        vehicleType: z.string().optional().default('Saloon'),
                        isReturn: z.boolean().optional().default(false).describe('True if a return trip was requested'),
                        returnTimeISO: z.string().optional().describe('ISO 8601 formatted date and time for the return trip'),
                        returnFlightNumber: z.string().optional(),
                        fare: z.number().optional().describe('The calculated total price previously agreed on by the customer')
                    }),
                    execute: async ({ passengerName, passengerPhone, passengerEmail, pickupAddress, dropoffAddress, pickupTimeISO, passengers, luggage, flightNumber, vehicleType, isReturn, returnTimeISO, returnFlightNumber, fare }) => {
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

                            const hasReturn = isReturn && returnTimeISO;
                            const mainFare = fare ? (hasReturn ? fare / 2 : fare) : null;

                            // Create Job with the fare
                            const job = await prisma.job.create({
                                data: {
                                    tenantId: tenant.id,
                                    customerId: customer.id,
                                    passengerName,
                                    passengerPhone,
                                    passengerEmail,
                                    pickupAddress,
                                    dropoffAddress,
                                    pickupTime: new Date(pickupTimeISO),
                                    passengers,
                                    luggage,
                                    flightNumber,
                                    vehicleType,
                                    isReturn: isReturn || false,
                                    fare: mainFare,
                                    status: 'PENDING',
                                    paymentType: 'CASH',
                                    autoDispatch: false,
                                    notes: 'Submitted via Web Chat AI (CABAI).'
                                }
                            });
                            
                            if (hasReturn) {
                                await prisma.job.create({
                                    data: {
                                        tenantId: tenant.id,
                                        parentJobId: job.id,
                                        customerId: customer.id,
                                        passengerName,
                                        passengerPhone,
                                        passengerEmail,
                                        pickupAddress: dropoffAddress,
                                        dropoffAddress: pickupAddress,
                                        pickupTime: new Date(returnTimeISO as string),
                                        passengers,
                                        luggage,
                                        vehicleType,
                                        flightNumber: returnFlightNumber,
                                        isReturn: true,
                                        fare: fare ? fare / 2 : null,
                                        status: 'PENDING',
                                        paymentType: 'CASH',
                                        autoDispatch: false,
                                        notes: 'Return Leg via Web Chat AI (CABAI).'
                                    }
                                });
                            }

                            return { success: true, jobId: job.id, message: 'Booking request successfully submitted to dispatch console.' };
                        } catch (e: any) {
                            return { success: false, error: 'Database error while submitting booking. ' + e.message };
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
