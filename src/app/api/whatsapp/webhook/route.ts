import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import OpenAI from 'openai';

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

            // ---- CABOT AI AGENT INJECTION HERE ----
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
Your goal is to collect:
1. Pickup location
2. Drop-off location
3. Date and Time of pickup
4. Passenger Name

Ask for these details naturally. By default, assume 1 passenger and a "Saloon" vehicle unless specified otherwise.
Once you have ALL 4 pieces of information, call the "create_booking" tool to finalize the booking. Do not confirm the booking until you have called the tool.`;

                const tools = [
                    {
                        type: "function" as const,
                        function: {
                            name: "create_booking",
                            description: "Creates a new taxi booking in the dispatch system when all details have been collected.",
                            parameters: {
                                type: "object",
                                properties: {
                                    passengerName: { type: "string" },
                                    pickupLocation: { type: "string" },
                                    dropoffLocation: { type: "string" },
                                    pickupTime: { type: "string", description: "ISO 8601 formatted date and time string for the pickup." },
                                    passengers: { type: "number", default: 1 },
                                    vehicleType: { type: "string", default: "Saloon" }
                                },
                                required: ["passengerName", "pickupLocation", "dropoffLocation", "pickupTime"]
                            }
                        }
                    }
                ];

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
                    // Process tool call
                    const toolCall = responseMessage.tool_calls[0] as any;
                    if (toolCall.type === 'function' && toolCall.function?.name === 'create_booking') {
                        const args = JSON.parse(toolCall.function.arguments);
                        // Create the PENDING Job
                        await prisma.job.create({
                            data: {
                                tenantId: tenant.id,
                                passengerName: args.passengerName,
                                passengerPhone: passengerPhone,
                                pickupAddress: args.pickupLocation,
                                dropoffAddress: args.dropoffLocation,
                                pickupTime: new Date(args.pickupTime),
                                passengers: args.passengers || 1,
                                vehicleType: args.vehicleType || "Saloon",
                                status: "PENDING"
                            }
                        });

                        // Feed the tool result back to the AI
                        openAiMessages.push(responseMessage);
                        openAiMessages.push({
                            role: "tool",
                            tool_call_id: toolCall.id,
                            content: "Booking successfully created with status PENDING."
                        });

                        const postToolCompletion = await openai.chat.completions.create({
                            model: "gpt-4o",
                            messages: [
                                { role: "system", content: systemPrompt },
                                ...openAiMessages
                            ]
                        });
                        
                        finalAiReply = postToolCompletion.choices[0].message.content || "";
                        openAiMessages.push({ role: "assistant", content: finalAiReply });
                    }
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
