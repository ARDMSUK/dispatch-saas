import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export const maxDuration = 60; // Extend Vercel timeout to 60 seconds so Baileys can boot

// Gateway credentials (would be in your .env or master config)
const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || 'http://localhost:8080';
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || 'global-master-key';
const NEXT_PUBLIC_BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://dispatch-saas.vercel.app';

export async function POST(req: Request) {
    try {
        const session = await auth();
        if (!session?.user?.tenantId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const tenantId = session.user.tenantId;

        // Fetch current tenant
        const tenant = await prisma.tenant.findUnique({
            where: { id: tenantId }
        });

        if (!tenant) {
            return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
        }

        let instanceId = tenant.whatsappInstanceId;

        // If no instance exists for this tenant, define a unique one
        if (!instanceId) {
            instanceId = `t_${tenantId.slice(0, 10)}_${Date.now()}`;
            
            await prisma.tenant.update({
                where: { id: tenantId },
                data: {
                    whatsappInstanceId: instanceId,
                    whatsappInstanceStatus: "CONNECTING"
                }
            });
        }

        // Sanitize Gateway URL
        const gatewayUrl = EVOLUTION_API_URL.replace(/\/$/, "");

        console.log(`[WHATSAPP] Requesting Gateway connection for instance: ${instanceId}`);
        
        try {
            let qrCodeData = null;
            let finalInstanceName = instanceId;

            // 1. If it already existed, it's already created on Railway. Just fetch a new QR.
            if (tenant.whatsappInstanceId) {
                console.log("[WHATSAPP] Fetching connection for existing instance...");
                const connectRes = await fetch(`${gatewayUrl}/instance/connect/${instanceId}`, {
                    method: 'GET',
                    headers: { 'apikey': EVOLUTION_API_KEY }
                });

                if (connectRes.ok) {
                    const data = await connectRes.json();
                    if (data.base64) {
                        qrCodeData = data.base64;
                    }
                } else {
                    console.log("[WHATSAPP] Instance not found on gateway, falling back to CREATE.");
                }
            }

            // 2. If it's a completely new request or the Railway instance got deleted, CREATE it.
            if (!qrCodeData) {
                console.log("[WHATSAPP] Creating new instance on Gateway...");
                const gatewayRes = await fetch(`${gatewayUrl}/instance/create`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'apikey': EVOLUTION_API_KEY
                    },
                    body: JSON.stringify({
                        instanceName: instanceId,
                        qrcode: true,
                        integration: 'WHATSAPP-BAILEYS',
                        webhook: `${NEXT_PUBLIC_BASE_URL}/api/whatsapp/webhook`,
                        webhook_by_events: false,
                        events: [
                            'MESSAGES_UPSERT',
                            'CONNECTION_UPDATE'
                        ]
                    })
                });

                if (!gatewayRes.ok) {
                    const errorData = await gatewayRes.json().catch(() => ({}));
                    console.error("[WHATSAPP] Gateway Creation Rejection:", errorData);
                    
                    if (!process.env.EVOLUTION_API_URL) {
                        return NextResponse.json({ error: "Gateway Not Configured" }, { status: 502 });
                    }
                    return NextResponse.json({ error: "Gateway proxy failure", details: errorData }, { status: 502 });
                }

                const data = await gatewayRes.json();
                qrCodeData = data.qrcode?.base64 || null;
                finalInstanceName = data.instance?.instanceName || instanceId;
            }
            
            return NextResponse.json({
                qrcode: qrCodeData,
                instanceName: finalInstanceName
            });

        } catch (fetchError) {
            console.error("[WHATSAPP] Fatal connection to gateway failed:", fetchError);
            
            return NextResponse.json({ error: "Cannot reach WhatsApp Gateway Server" }, { status: 503 });
        }

    } catch (error) {
        console.error("[API_WHATSAPP_CONNECT_ERROR]", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
