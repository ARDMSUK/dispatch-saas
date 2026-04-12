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
                const openai = new OpenAI();
                // Simple MVP agent response for now
                const completion = await openai.chat.completions.create({
                    model: "gpt-4o-mini",
                    messages: [
                        { role: "system", content: `You are the AI dispatch assistant for ${tenant.name}. You schedule taxis. Keep your answer under 2 sentences.` },
                        { role: "user", content: textContent }
                    ]
                });

                const aiReply = completion.choices[0].message.content;

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
