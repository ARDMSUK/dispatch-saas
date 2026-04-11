import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

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

        // Call our dedicated Gateway Server (Evolution API)
        console.log(`[WHATSAPP] Requesting Gateway connection for instance: ${instanceId}`);
        
        try {
            const gatewayRes = await fetch(`${EVOLUTION_API_URL}/instance/create`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': EVOLUTION_API_KEY
                },
                body: JSON.stringify({
                    instanceName: instanceId,
                    qrcode: true, // Tell it to return a Base64 QR code immediately
                    integration: 'WHATSAPP-BAILEYS',
                    webhook_url: `${NEXT_PUBLIC_BASE_URL}/api/whatsapp/webhook`,
                    webhook_by_events: false,
                    events: [
                        'MESSAGES_UPSERT',   // When we receive a text
                        'CONNECTION_UPDATE'  // When the user actually scans the QR successfully
                    ]
                })
            });

            if (!gatewayRes.ok) {
                // If the instance already exists on the server, we might just need to fetch its connection state or request a new QR
                const errorData = await gatewayRes.json().catch(() => ({}));
                console.error("[WHATSAPP] Gateway Rejection:", errorData);
                
                // In Production: If no gateway URL is set, we throw immediately.
                if (!process.env.EVOLUTION_API_URL) {
                    console.error("[WHATSAPP] Gateway Not Configured.");
                    return NextResponse.json({ error: "Gateway Not Configured" }, { status: 502 });
                }

                return NextResponse.json({ error: "Gateway proxy failure", details: errorData }, { status: 502 });
            }

            const data = await gatewayRes.json();
            
            // Expected return from Evolution API contains the Base64 QR
            return NextResponse.json({
                qrcode: data.qrcode?.base64 || null,
                instanceName: data.instance?.instanceName || instanceId
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
