import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { calculatePrice } from '@/lib/pricing';
import OpenAI from 'openai';
import { getMapboxMatrix } from '@/lib/mapbox';
import { broadcastOperatorAlert } from '@/lib/supabase-broadcast';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        
        // Evolution API Webhook Signature
        // Reference: https://doc.evolution-api.com/v2/en/guide/webhooks
        
        const eventType = body.event;
        const instanceId = body.instance;

        // DEBUG: Save payload to DB so we can inspect the exact v2 schema
        if (eventType === 'messages.upsert') {
            try {
                await prisma.tenant.updateMany({
                   where: { whatsappInstanceId: instanceId },
                   data: { emailBodyReceipt: JSON.stringify(body) }
                });
            } catch(e) {}
        }

        // 1. Handle Connection Status Webhooks
        if (eventType === 'connection.update') {
            const state = body.data?.state; // 'open', 'close', 'connecting'
            
            if (state === 'open') {
                console.log(`[WHATSAPP WEBHOOK] Instance ${instanceId} connected successfully!`);
                await prisma.tenant.updateMany({
                    where: { whatsappInstanceId: instanceId },
                    data: { whatsappInstanceStatus: 'CONNECTED' }
                });
            } else if (state === 'close') {
                console.log(`[WHATSAPP WEBHOOK] Instance ${instanceId} disconnected.`);
                await prisma.tenant.updateMany({
                    where: { whatsappInstanceId: instanceId },
                    data: { whatsappInstanceStatus: 'DISCONNECTED' }
                });
            }
            return NextResponse.json({ success: true });
        }

        // 2. Handle Incoming Passenger Messages
        if (eventType === 'messages.upsert') {
            const payloadData = body.data;
            if (!payloadData) return NextResponse.json({ success: true });

            const messageKey = payloadData.key;
            const messageObj = payloadData.message;

            if (!messageKey || !messageObj) return NextResponse.json({ success: true });

            // Ensure we aren't replying to our own outgoing messages
            if (messageKey.fromMe) return NextResponse.json({ success: true });

            const remoteJid = messageKey.remoteJid; // e.g. "447123456789@s.whatsapp.net"
            const passengerPhone = remoteJid?.split('@')[0];
            const textContent = messageObj.conversation || messageObj.extendedTextMessage?.text || "";

            if (!textContent || !passengerPhone) return NextResponse.json({ success: true });

            console.log(`[WHATSAPP MESSAGE] Tenant ${instanceId} received from ${passengerPhone}: ${textContent}`);

            // Find Tenant
            const tenant = await prisma.tenant.findFirst({
                where: { whatsappInstanceId: instanceId }
            });

            if (!tenant || !tenant.hasWhatsAppAi) {
                return NextResponse.json({ success: true, ignored: true });
            }

            // ---- CABAI AGENT INJECTION HERE ----
            // We ping the LLM to decide what to reply to the passenger
            try {
                // Fetch or Create session
                let session = await prisma.whatsappSession.findUnique({
                    where: { tenantId_userPhone: { tenantId: tenant.id, userPhone: passengerPhone } }
                });

                if (!session) {
                    session = await prisma.whatsappSession.create({
                        data: {
                            tenantId: tenant.id,
                            userPhone: passengerPhone,
                            messages: []
                        }
                    });
                }

                // Add user message
                let openAiMessages = Array.isArray(session.messages) ? session.messages as any[] : [];
                openAiMessages.push({ role: "user", content: textContent });

                const openai = new OpenAI();
                
                const systemPrompt = `You are the AI dispatch assistant for ${tenant.name}. You schedule taxis. Keep your answers brief.
The current date and time is ${new Date().toLocaleString('en-GB')}. Use this as your reference point for "today" and allow bookings for future dates.

Your goal is to collect all of the following requirements for a quote or booking:
1. Date of travel
2. Pickup time
3. Pickup Address, including postcode
4. Destination address
5. Number of passengers
6. Number of bags
7. Passenger Name
8. Email Address
9. Telephone No
10. Is a return journey required?
11. If a return journey is required, you must also ask for: Return journey date, Return journey time, and if it's an airport transfer, the return flight number.

Ask for these details naturally in conversation. Once you have ALL the required pieces of information, you MUST follow this two-step process:
STEP 1: Call the "calculate_quote" tool to get the estimated price based on the job details.
STEP 2: Tell the passenger the estimated price and ask if they would like to proceed.
STEP 3: ONLY IF they explicitly say yes and authorize the booking, call the "create_booking" tool to finalize the booking. Include the quoted fare. STEP 3: ONLY IF they explicitly say yes and authorize the booking, call the "create_booking" tool to finalize the booking. Include the quoted fare. Do not confirm the booking until you have successfully called the create_booking tool.
If the passenger asks where their taxi is or checks their journey status, call the "check_booking_status" tool.
If the passenger wants to modify booking details (time, pickup, destination) or reports an issue, call the "modify_booking_request" tool. Present any updates or operator routing confirmations to the user.`;

                const tools = [
                    {
                        type: "function" as const,
                        function: {
                            name: "calculate_quote",
                            description: "Calculates the estimated price for a trip based on distance, time, and vehicle type.",
                            parameters: {
                                type: "object",
                                properties: {
                                    pickupLocation: { type: "string" },
                                    dropoffLocation: { type: "string" },
                                    pickupTime: { type: "string", description: "ISO 8601 formatted date and time string." },
                                    vehicleType: { type: "string", default: "Saloon" },
                                    isReturn: { type: "boolean" }
                                },
                                required: ["pickupLocation", "dropoffLocation", "pickupTime"]
                            }
                        }
                    },
                    {
                        type: "function" as const,
                        function: {
                            name: "create_booking",
                            description: "Creates a new taxi booking in the dispatch system once the quote is approved.",
                            parameters: {
                                type: "object",
                                properties: {
                                    passengerName: { type: "string" },
                                    passengerEmail: { type: "string" },
                                    passengerPhone: { type: "string" },
                                    pickupLocation: { type: "string" },
                                    dropoffLocation: { type: "string" },
                                    pickupTime: { type: "string", description: "ISO 8601 formatted date and time string for the pickup." },
                                    passengers: { type: "number", default: 1 },
                                    luggage: { type: "number", default: 0 },
                                    vehicleType: { type: "string", default: "Saloon" },
                                    isReturn: { type: "boolean" },
                                    returnTime: { type: "string", description: "ISO 8601 formatted date and time string for the return leg, if applicable." },
                                    returnFlightNumber: { type: "string" },
                                    fare: { type: "number", description: "The previously quoted estimated price." }
                                },
                                required: ["passengerName", "passengerEmail", "passengerPhone", "pickupLocation", "dropoffLocation", "pickupTime", "passengers", "luggage", "isReturn", "fare"]
                            }
                        }
                    },
                    {
                        type: "function" as const,
                        function: {
                            name: "lookup_faq",
                            description: "Searches the taxi company's policies, terms, rules, baby seat availability, child options, and meeting spots.",
                            parameters: {
                                type: "object",
                                properties: {
                                    query: { type: "string", description: "Search term or question keywords." }
                                },
                                required: ["query"]
                            }
                        }
                    }
                ];

                if (tenant.hasAiCopilot && tenant.enableAiCopilot) {
                    tools.push(
                        {
                            type: "function" as const,
                            function: {
                                name: "check_booking_status",
                                description: "Retrieves the status, driver details, vehicle info, and ETA of the customer's active trip.",
                                parameters: {
                                    type: "object",
                                    properties: {
                                        passengerPhone: { type: "string", description: "Optional phone number. Fallback to caller number." }
                                    }
                                } as any
                            }
                        },
                        {
                            type: "function" as const,
                            function: {
                                name: "modify_booking_request",
                                description: "Requests changes to booking details (date, time, locations) or logs an issue (taxi not arrived).",
                                parameters: {
                                    type: "object",
                                    properties: {
                                        bookingId: { type: "string", description: "The reference number of the booking." },
                                        requestType: { type: "string", enum: ["CHANGE_TIME", "CHANGE_LOCATION", "DELAY_INQUIRY"], description: "The type of request." },
                                        details: { type: "string", description: "Freeform text description of the changes requested or issue." },
                                        newPickupTime: { type: "string", description: "Optional. ISO 8601 new date/time requested." },
                                        newPickupLocation: { type: "string", description: "Optional. New pickup address." },
                                        newDropoffLocation: { type: "string", description: "Optional. New destination address." }
                                    },
                                    required: ["bookingId", "requestType", "details"]
                                } as any
                            }
                        }
                    );
                }

                const completion = await openai.chat.completions.create({
                    model: "gpt-4o",
                    messages: [
                        { role: "system", content: systemPrompt },
                        ...openAiMessages
                    ],
                    tools: tools,
                    tool_choice: "auto"
                });

                const responseMessage = completion.choices[0].message;
                let finalAiReply = "";

                if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
                    openAiMessages.push(responseMessage);
                    
                    for (const toolCall of responseMessage.tool_calls) {
                        try {
                            if (toolCall.type === 'function' && toolCall.function?.name === 'calculate_quote') {
                                const args = JSON.parse(toolCall.function.arguments);
                                const dateObj = new Date(args.pickupTime);
                                const priceResult = await calculatePrice({
                                    pickup: args.pickupLocation,
                                    dropoff: args.dropoffLocation,
                                    pickupTime: dateObj,
                                    vehicleType: args.vehicleType || "Saloon",
                                    companyId: tenant.id
                                });

                                let totalQuote = priceResult.price;
                                if (args.isReturn) {
                                    totalQuote = priceResult.price * 2;
                                }

                                openAiMessages.push({
                                    role: "tool",
                                    tool_call_id: toolCall.id,
                                    content: `The estimated price is £${totalQuote.toFixed(2)}. Breakdown: ${priceResult.breakdown.isFixed ? "Fixed Fare" : "Metered Fare"}. Present this price to the user.`
                                });
                            }
                            else if (toolCall.type === 'function' && toolCall.function?.name === 'create_booking') {
                                const args = JSON.parse(toolCall.function.arguments);
                                
                                const hasReturn = args.isReturn && args.returnTime;
                                const mainFare = args.fare ? (hasReturn ? args.fare / 2 : args.fare) : null;
                                
                                // Create the PENDING Job
                                const mainJob = await prisma.job.create({
                                    data: {
                                        tenantId: tenant.id,
                                        passengerName: args.passengerName,
                                        passengerPhone: args.passengerPhone || passengerPhone,
                                        passengerEmail: args.passengerEmail,
                                        pickupAddress: args.pickupLocation,
                                        dropoffAddress: args.dropoffLocation,
                                        pickupTime: new Date(args.pickupTime),
                                        passengers: args.passengers || 1,
                                        luggage: args.luggage || 0,
                                        vehicleType: args.vehicleType || "Saloon",
                                        isReturn: args.isReturn || false,
                                        fare: mainFare,
                                        status: "PENDING"
                                    }
                                });

                                if (hasReturn) {
                                    await prisma.job.create({
                                        data: {
                                            tenantId: tenant.id,
                                            parentJobId: mainJob.id,
                                            passengerName: args.passengerName,
                                            passengerPhone: args.passengerPhone || passengerPhone,
                                            passengerEmail: args.passengerEmail,
                                            pickupAddress: args.dropoffLocation,
                                            dropoffAddress: args.pickupLocation,
                                            pickupTime: new Date(args.returnTime),
                                            passengers: args.passengers || 1,
                                            luggage: args.luggage || 0,
                                            vehicleType: args.vehicleType || "Saloon",
                                            flightNumber: args.returnFlightNumber,
                                            isReturn: true,
                                            fare: args.fare ? args.fare / 2 : null,
                                            status: "PENDING"
                                        }
                                    });
                                }

                                openAiMessages.push({
                                    role: "tool",
                                    tool_call_id: toolCall.id,
                                    content: "Booking successfully created with status PENDING."
                                });
                            }
                            else if (toolCall.type === 'function' && toolCall.function?.name === 'lookup_faq') {
                                const args = JSON.parse(toolCall.function.arguments);
                                const rawFaqs = await prisma.tenantFaq.findMany({
                                    where: { tenantId: tenant.id }
                                });
                                
                                const queryLower = args.query.toLowerCase();
                                const matches = rawFaqs.filter(faq => {
                                    const q = faq.question.toLowerCase();
                                    const a = faq.answer.toLowerCase();
                                    return q.includes(queryLower) || a.includes(queryLower) || 
                                           queryLower.split(' ').some((word: string) => word.length > 3 && (q.includes(word) || a.includes(word)));
                                });
                                
                                let content = "";
                                if (matches.length > 0) {
                                    content = `Found relevant company information:\n` + 
                                        matches.slice(0, 3).map(m => `Q: ${m.question}\nA: ${m.answer}`).join("\n---\n");
                                } else {
                                    content = "No direct match found in database for this query. Answer using general helpful knowledge, or tell the passenger a dispatcher will clarify if highly specific.";
                                }
                                
                                openAiMessages.push({
                                    role: "tool",
                                    tool_call_id: toolCall.id,
                                    content
                                });
                            }
                            else if (toolCall.type === 'function' && toolCall.function?.name === 'check_booking_status') {
                                const args = JSON.parse(toolCall.function.arguments);
                                
                                const callPhone = passengerPhone || "";
                                const cleanCallPhone = callPhone.replace(/[^0-9+]/g, '');
                                const callSuffix = cleanCallPhone.replace(/[^0-9]/g, '').slice(-10);

                                const inputPhone = args.passengerPhone ? args.passengerPhone.replace(/[^0-9]/g, '').slice(-10) : "";
                                const finalSuffix = inputPhone || callSuffix;

                                if (!finalSuffix) {
                                    openAiMessages.push({
                                        role: "tool",
                                        tool_call_id: toolCall.id,
                                        content: "Error: No passenger phone number provided or detected."
                                    });
                                    continue;
                                }

                                const activeJob = await prisma.job.findFirst({
                                    where: {
                                        tenantId: tenant.id,
                                        passengerPhone: { endsWith: finalSuffix },
                                        status: { in: ['ACCEPTED', 'DISPATCHED', 'ARRIVED', 'POB'] }
                                    },
                                    include: {
                                        driver: true
                                    },
                                    orderBy: {
                                        bookedAt: 'desc'
                                    }
                                });

                                if (!activeJob) {
                                    const pendingJob = await prisma.job.findFirst({
                                        where: {
                                            tenantId: tenant.id,
                                            passengerPhone: { endsWith: finalSuffix },
                                            status: 'PENDING'
                                        },
                                        orderBy: {
                                            bookedAt: 'desc'
                                        }
                                    });

                                    if (pendingJob) {
                                        openAiMessages.push({
                                            role: "tool",
                                            tool_call_id: toolCall.id,
                                            content: `Found booking #${pendingJob.id} from ${pendingJob.pickupAddress} to ${pendingJob.dropoffAddress} scheduled for ${new Date(pendingJob.pickupTime).toLocaleString('en-GB')}. It is currently pending driver assignment. No driver is dispatched yet.`
                                        });
                                    } else {
                                        openAiMessages.push({
                                            role: "tool",
                                            tool_call_id: toolCall.id,
                                            content: "No active or upcoming bookings found for your phone number."
                                        });
                                    }
                                    continue;
                                }

                                let driverMsg = "No driver has started tracking yet.";
                                let vehicleMsg = "";
                                
                                if (activeJob.driver) {
                                    const driver = activeJob.driver;
                                    const vehicle = await prisma.vehicle.findFirst({
                                        where: { driverId: driver.id }
                                    });

                                    driverMsg = `Your driver is ${driver.name} (Callsign: ${driver.callsign}).`;
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

                                openAiMessages.push({
                                    role: "tool",
                                    tool_call_id: toolCall.id,
                                    content: `${statusDescription} Booking reference is #${activeJob.id}. ${driverMsg}${vehicleMsg}`
                                });
                            }
                            else if (toolCall.type === 'function' && toolCall.function?.name === 'modify_booking_request') {
                                const args = JSON.parse(toolCall.function.arguments);
                                const bookingId = args.bookingId;
                                const requestType = args.requestType;
                                const details = args.details;

                                const job = await prisma.job.findUnique({
                                    where: { id: bookingId }
                                });

                                if (!job) {
                                    openAiMessages.push({
                                        role: "tool",
                                        tool_call_id: toolCall.id,
                                        content: `Error: Booking ID ${bookingId} not found.`
                                    });
                                    continue;
                                }

                                const twoHoursFromNow = new Date(Date.now() + 2 * 60 * 60 * 1000);
                                const isSafeToEdit = job.status === 'PENDING' && new Date(job.pickupTime) > twoHoursFromNow;

                                if (isSafeToEdit) {
                                    const updateData: any = {};
                                    let changeSummary = [];
                                    
                                    if (args.newPickupTime) {
                                        updateData.pickupTime = new Date(args.newPickupTime);
                                        changeSummary.push(`pickup time to ${new Date(args.newPickupTime).toLocaleString('en-GB')}`);
                                    }
                                    if (args.newPickupLocation) {
                                        updateData.pickupAddress = args.newPickupLocation;
                                        changeSummary.push(`pickup location to ${args.newPickupLocation}`);
                                    }
                                    if (args.newDropoffLocation) {
                                        updateData.dropoffAddress = args.newDropoffLocation;
                                        changeSummary.push(`destination to ${args.newDropoffLocation}`);
                                    }

                                    if (Object.keys(updateData).length > 0) {
                                        if (args.newPickupLocation || args.newDropoffLocation) {
                                            try {
                                                const priceResult = await calculatePrice({
                                                    pickup: args.newPickupLocation || job.pickupAddress,
                                                    dropoff: args.newDropoffLocation || job.dropoffAddress,
                                                    pickupTime: updateData.pickupTime || new Date(job.pickupTime),
                                                    vehicleType: job.vehicleType || "Saloon",
                                                    companyId: tenant.id
                                                });
                                                updateData.fare = priceResult.price;
                                                changeSummary.push(`fare recalculated to £${priceResult.price.toFixed(2)}`);
                                            } catch (e) {}
                                        }

                                        await prisma.job.update({
                                            where: { id: bookingId },
                                            data: updateData
                                        });

                                        openAiMessages.push({
                                            role: "tool",
                                            tool_call_id: toolCall.id,
                                            content: `The booking has been successfully updated with the requested changes: ${changeSummary.join(', ')}.`
                                        });
                                    } else {
                                        await broadcastOperatorAlert({
                                            tenantId: tenant.id,
                                            alertType: 'modification-request',
                                            message: `Passenger requested: "${details}" for Booking #${bookingId}`,
                                            bookingId,
                                            passengerPhone: job.passengerPhone
                                        });

                                        openAiMessages.push({
                                            role: "tool",
                                            tool_call_id: toolCall.id,
                                            content: "I've sent a priority alert to our dispatch operators to modify the booking details manually. They will coordinate the request."
                                        });
                                    }
                                } else {
                                    await broadcastOperatorAlert({
                                        tenantId: tenant.id,
                                        alertType: 'modification-request',
                                        message: `URGENT change requested for active Booking #${bookingId} (${job.status}): "${details}"`,
                                        bookingId,
                                        passengerPhone: job.passengerPhone
                                    });

                                    openAiMessages.push({
                                        role: "tool",
                                        tool_call_id: toolCall.id,
                                        content: "Because this booking is scheduled to take place soon or a driver has already been assigned, I cannot modify it automatically. However, I have sent an urgent alert to our dispatch team, and an operator will adjust it immediately."
                                    });
                                }
                            }
                        } catch (e: any) {
                            console.error("[WHATSAPP WEBHOOK] Tool error:", e);
                            openAiMessages.push({
                                role: "tool",
                                tool_call_id: toolCall.id,
                                content: `Error processing request. Error: ${e.message}`
                            });
                        }
                    }

                    const postToolCompletion = await openai.chat.completions.create({
                        model: "gpt-4o",
                        messages: [
                            { role: "system", content: systemPrompt },
                            ...openAiMessages
                        ]
                    });
                    
                    finalAiReply = postToolCompletion.choices[0].message.content || "";
                    openAiMessages.push({ role: "assistant", content: finalAiReply });
                } else {
                    finalAiReply = responseMessage.content || "";
                    openAiMessages.push({ role: "assistant", content: finalAiReply });
                }

                // Save session
                await prisma.whatsappSession.update({
                    where: { id: session.id },
                    data: { messages: openAiMessages }
                });

                const aiReply = finalAiReply;

                // Send reply back to passenger via the Gateway
                let rawGateway = process.env.EVOLUTION_API_URL || 'http://localhost:8080';
                rawGateway = rawGateway.replace(/\/$/, "");
                if (!/^https?:\/\//i.test(rawGateway)) {
                    rawGateway = `https://${rawGateway}`;
                }

                console.log(`[WHATSAPP WEBHOOK] Sending reply to ${remoteJid}...`);
                const sendRes = await fetch(`${rawGateway}/message/sendText/${instanceId}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'apikey': process.env.EVOLUTION_API_KEY || 'global-master-key'
                    },
                    body: JSON.stringify({
                        number: remoteJid, // Send back to exact contact
                        text: aiReply,
                        delay: 1500 // Automatically injects "typing..." presence in v2
                    })
                });

                if (!sendRes.ok) {
                    const sendErr = await sendRes.text();
                    console.error("[WHATSAPP WEBHOOK] Gateway refused to send reply:", sendErr);
                } else {
                    console.log("[WHATSAPP WEBHOOK] AI Reply Sent successfully!");
                }

            } catch (aiError) {
                console.error("[WHATSAPP] Failed to generate AI response:", aiError);
            }
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        // We always return 200 to webhooks so the gateway doesn't retry forever
        console.error("[API_WHATSAPP_WEBHOOK_ERROR]", error);
        return NextResponse.json({ success: false });
    }
}
