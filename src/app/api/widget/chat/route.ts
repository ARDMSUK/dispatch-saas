import { openai } from '@ai-sdk/openai';
import { streamText, tool } from 'ai';
import { prisma } from '@/lib/prisma';
import { calculatePrice } from '@/lib/pricing';
import { getMapboxMatrix } from '@/lib/mapbox';
import { broadcastOperatorAlert } from '@/lib/supabase-broadcast';
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

        let systemPrompt = `
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

FAQ / CUSTOMER INQUIRIES:
Always use the "lookupFaq" tool to check for relevant company terms, guidelines, policies, meeting spots, or vehicle types before answering general questions.
`;

        if (tenant.hasAiCopilot && tenant.enableAiCopilot) {
            systemPrompt += `
BOOKING STATUS & MODIFICATIONS (AI COPILOT IS ACTIVE):
- If the customer asks for status updates, ETAs, or driver/vehicle details, use the "checkBookingStatus" tool. Ask for their phone number if not apparent.
- If the customer asks to change, reschedule, cancel, or modify their booking, use the "modifyBookingRequest" tool.
`;
        }

        systemPrompt += `
If you don't know the answer to a question (and lookupFaq returns nothing useful), apologize and say: "I will connect you to our human dispatcher, please wait."
Never mention that you are an AI model. You are CABAI.`;

        const chatTools: Record<string, any> = {
            calculateQuote: {
                description: 'Calculates the estimated price for a trip based on distance, time, and vehicle type. Call this BEFORE confirm booking.',
                parameters: z.object({
                    pickupLocation: z.string().describe('Exact pickup location'),
                    dropoffLocation: z.string().describe('Exact dropoff location'),
                    pickupTimeISO: z.string().describe('ISO 8601 formatted date and time for the pickup'),
                    vehicleType: z.string().optional().default('Saloon').describe('Type of vehicle'),
                    isReturn: z.boolean().optional().default(false).describe('Whether this is a return trip quote')
                }),
                execute: async (args: any) => {
                    const { pickupLocation, dropoffLocation, pickupTimeISO, vehicleType, isReturn } = args;
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
            },
            submitBookingRequest: {
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
                execute: async (args: any) => {
                    const { passengerName, passengerPhone, passengerEmail, pickupAddress, dropoffAddress, pickupTimeISO, passengers, luggage, flightNumber, vehicleType, isReturn, returnTimeISO, returnFlightNumber, fare } = args;
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
            },
            lookupFaq: {
                description: "Searches the taxi company's policies, terms, rules, baby seat availability, child options, and meeting spots.",
                parameters: z.object({
                    query: z.string().describe("Search term or question keywords.")
                }),
                execute: async (args: any) => {
                    const { query } = args;
                    try {
                        const rawFaqs = await prisma.tenantFaq.findMany({
                            where: { tenantId: tenant.id }
                        });
                        const queryLower = query.toLowerCase();
                        const matches = rawFaqs.filter(faq => {
                            const q = faq.question.toLowerCase();
                            const a = faq.answer.toLowerCase();
                            return q.includes(queryLower) || a.includes(queryLower) ||
                                   queryLower.split(' ').some((word: string) => word.length > 3 && (q.includes(word) || a.includes(word)));
                        });
                        if (matches.length > 0) {
                            return {
                                success: true,
                                results: matches.slice(0, 3).map(m => ({ question: m.question, answer: m.answer }))
                            };
                        } else {
                            return {
                                success: false,
                                message: "No relevant FAQ matches found in company knowledge base. Answer using general helpful knowledge."
                            };
                        }
                    } catch (e: any) {
                        return { success: false, error: 'Database error. ' + e.message };
                    }
                }
            }
        };

        if (tenant.hasAiCopilot && tenant.enableAiCopilot) {
            chatTools.checkBookingStatus = {
                description: "Retrieves the status, driver details, vehicle info, and ETA of the customer's active trip.",
                parameters: z.object({
                    passengerPhone: z.string().describe("Passenger phone number to query status for.")
                }),
                execute: async (args: any): Promise<any> => {
                    const { passengerPhone } = args;
                    try {
                        const cleanPhone = passengerPhone.replace(/[^0-9+]/g, '');
                        const suffix = cleanPhone.replace(/[^0-9]/g, '').slice(-10);

                        if (!suffix) {
                            return { success: false, error: "Missing or invalid phone number format." };
                        }

                        const activeJob = await prisma.job.findFirst({
                            where: {
                                tenantId: tenant.id,
                                passengerPhone: { endsWith: suffix },
                                status: { in: ['ACCEPTED', 'DISPATCHED', 'ARRIVED', 'POB'] }
                            },
                            include: { driver: true },
                            orderBy: { bookedAt: 'desc' }
                        });

                        if (!activeJob) {
                            const pendingJob = await prisma.job.findFirst({
                                where: {
                                    tenantId: tenant.id,
                                    passengerPhone: { endsWith: suffix },
                                    status: 'PENDING'
                                },
                                orderBy: { bookedAt: 'desc' }
                            });

                            if (pendingJob) {
                                return {
                                    success: true,
                                    status: "PENDING",
                                    message: `Found booking #${pendingJob.id} from ${pendingJob.pickupAddress} to ${pendingJob.dropoffAddress} scheduled for ${new Date(pendingJob.pickupTime).toLocaleString('en-GB')}. It is pending driver assignment.`
                                };
                            } else {
                                return { success: false, message: "No active or upcoming bookings found for this phone number." };
                            }
                        }

                        let driverMsg = "No driver has started tracking yet.";
                        let vehicleMsg = "";
                        
                        if (activeJob.driver) {
                            const driver = activeJob.driver;
                            const vehicle = await prisma.vehicle.findFirst({
                                where: { driverId: driver.id }
                            });

                            driverMsg = `Driver is ${driver.name} (Callsign: ${driver.callsign}).`;
                            if (vehicle) {
                                vehicleMsg = ` They are driving a ${vehicle.color || ""} ${vehicle.make} ${vehicle.model} with registration plate ${vehicle.reg}.`;
                            }

                            if (driver.currentLat && driver.currentLng && activeJob.pickupLat && activeJob.pickupLng) {
                                try {
                                    const matrix = await getMapboxMatrix(activeJob.pickupLat, activeJob.pickupLng, [{
                                        id: driver.id,
                                        lat: driver.currentLat,
                                        lng: driver.currentLng
                                    }]);
                                    
                                    if (matrix && matrix[driver.id]) {
                                        const durationMins = Math.ceil(matrix[driver.id].duration / 60);
                                        const distanceMiles = (matrix[driver.id].distance / 1609.34).toFixed(1);
                                        driverMsg += ` They are currently ${distanceMiles} miles away and are estimated to arrive in ${durationMins} minutes.`;
                                    }
                                } catch (e) {}
                            }
                        }

                        let statusDescription = "";
                        if (activeJob.status === 'ACCEPTED') {
                            statusDescription = "Your booking has been accepted by a driver.";
                        } else if (activeJob.status === 'DISPATCHED') {
                            statusDescription = "Your driver is currently on their way to you.";
                        } else if (activeJob.status === 'ARRIVED') {
                            statusDescription = "Your driver has arrived at the pickup location.";
                        } else if (activeJob.status === 'POB') {
                            statusDescription = "You are currently onboard the vehicle.";
                        }

                        return {
                            success: true,
                            status: activeJob.status,
                            message: `${statusDescription} Booking reference is #${activeJob.id}. ${driverMsg}${vehicleMsg}`
                        };
                    } catch (e: any) {
                        return { success: false, error: "Database error: " + e.message };
                    }
                }
            };

            chatTools.modifyBookingRequest = {
                description: "Requests modification of an existing booking (pickup time, locations, etc.).",
                parameters: z.object({
                    bookingId: z.string().describe("The ID of the booking to modify."),
                    requestType: z.enum(['date_change', 'time_change', 'route_change', 'cancellation', 'other']),
                    details: z.string().describe("Description of the changes requested by the customer."),
                    newPickupTime: z.string().optional().describe("ISO 8601 formatted new pickup time"),
                    newPickupLocation: z.string().optional().describe("New pickup address"),
                    newDropoffLocation: z.string().optional().describe("New dropoff address")
                }),
                execute: async (args: any): Promise<any> => {
                    const { bookingId, requestType, details, newPickupTime, newPickupLocation, newDropoffLocation } = args;
                    try {
                        const idNum = parseInt(bookingId);
                        if (isNaN(idNum)) {
                            return { success: false, error: "Invalid booking ID format. Must be a number." };
                        }

                        const job = await prisma.job.findUnique({ where: { id: idNum } });

                        if (!job) {
                            return { success: false, error: `Booking ID ${bookingId} not found.` };
                        }

                        const twoHoursFromNow = new Date(Date.now() + 2 * 60 * 60 * 1000);
                        const isSafeToEdit = job.status === 'PENDING' && new Date(job.pickupTime) > twoHoursFromNow;

                        if (isSafeToEdit) {
                            const updateData: any = {};
                            let changeSummary = [];
                            
                            if (newPickupTime) {
                                updateData.pickupTime = new Date(newPickupTime);
                                changeSummary.push(`pickup time to ${new Date(newPickupTime).toLocaleString('en-GB')}`);
                            }
                            if (newPickupLocation) {
                                updateData.pickupAddress = newPickupLocation;
                                changeSummary.push(`pickup location to ${newPickupLocation}`);
                            }
                            if (newDropoffLocation) {
                                updateData.dropoffAddress = newDropoffLocation;
                                changeSummary.push(`destination to ${newDropoffLocation}`);
                            }

                            if (Object.keys(updateData).length > 0) {
                                if (newPickupLocation || newDropoffLocation) {
                                    try {
                                        const priceResult = await calculatePrice({
                                            pickup: newPickupLocation || job.pickupAddress,
                                            dropoff: newDropoffLocation || job.dropoffAddress,
                                            pickupTime: updateData.pickupTime || new Date(job.pickupTime),
                                            vehicleType: job.vehicleType || "Saloon",
                                            companyId: tenant.id
                                        });
                                        updateData.fare = priceResult.price;
                                        changeSummary.push(`fare recalculated to £${priceResult.price.toFixed(2)}`);
                                    } catch (e) {}
                                }

                                await prisma.job.update({
                                    where: { id: idNum },
                                    data: updateData
                                });

                                return {
                                    success: true,
                                    message: `The booking has been successfully updated with the requested changes: ${changeSummary.join(', ')}.`
                                };
                            } else {
                                await broadcastOperatorAlert({
                                    tenantId: tenant.id,
                                    alertType: 'modification-request',
                                    message: `Passenger requested: "${details}" for Booking #${bookingId}`,
                                    bookingId: bookingId,
                                    passengerPhone: job.passengerPhone
                                });

                                return {
                                    success: true,
                                    message: "I've sent a priority alert to our dispatch operators to modify the booking details manually. They will coordinate the request."
                                };
                            }
                        } else {
                            await broadcastOperatorAlert({
                                tenantId: tenant.id,
                                alertType: 'modification-request',
                                message: `URGENT change requested for active Booking #${bookingId} (${job.status}): "${details}"`,
                                bookingId: bookingId,
                                passengerPhone: job.passengerPhone
                            });

                            return {
                                success: true,
                                message: "Because this booking is scheduled to take place soon or a driver has already been assigned, I cannot modify it automatically. However, I have sent an urgent alert to our dispatch team, and an operator will adjust it immediately."
                            };
                        }
                    } catch (err: any) {
                        return { success: false, error: "Error modifying booking: " + err.message };
                    }
                }
            };
        }

        const result = streamText({
            model: openai('gpt-4o-mini'),
            system: systemPrompt,
            messages: messages,
            tools: chatTools
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
