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
            const messageData = body.data?.message;
            if (!messageData) return NextResponse.json({ success: true });

            // Ensure we aren't replying to our own outgoing messages
            if (messageData.key?.fromMe) return NextResponse.json({ success: true });

            const remoteJid = messageData.key?.remoteJid; // e.g. "447123456789@s.whatsapp.net"
            const passengerPhone = remoteJid?.split('@')[0];
            const textContent = messageData.message?.conversation || messageData.message?.extendedTextMessage?.text || "";

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
                const gatewayUrl = process.env.EVOLUTION_API_URL || 'http://localhost:8080';
                await fetch(`${gatewayUrl}/message/sendText/${instanceId}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'apikey': process.env.EVOLUTION_API_KEY || 'global-master-key'
                    },
                    body: JSON.stringify({
                        number: remoteJid, // Send back to exact contact
                        options: {
                            delay: 1500, // Make it look like "typing"
                            presence: "composing",
                        },
                        textMessage: {
                            text: aiReply
                        }
                    })
                });

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
