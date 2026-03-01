import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';

// This is an external webhook intended to be called by a PBX (Twilio, 3CX, etc)
// It authenticates via a Bearer token matching the Tenant's ApiKey

const WebhookSchema = z.object({
    phone: z.string().min(1)
});

export async function POST(req: Request) {
    return handleWebhook(req);
}

export async function GET(req: Request) {
    return handleWebhook(req);
}

async function handleWebhook(req: Request) {
    try {
        const { searchParams } = new URL(req.url);

        let eventType = searchParams.get('event') || 'ringing';
        let phone: string | null = searchParams.get('phone') || searchParams.get('caller') || searchParams.get('callerid');

        if (req.method === 'POST') {
            try {
                const body = await req.json();
                phone = body.phone || body.caller || body.from || body.caller_id;

                // Support Yay.com specific event types in the JSON payload
                if (body.type) {
                    const typeStr = String(body.type).toLowerCase();
                    if (typeStr.includes('answered')) {
                        eventType = 'answered';
                    } else if (typeStr.includes('hungup') || typeStr.includes('hangup')) {
                        eventType = 'hungup';
                    }
                }
            } catch (e) {
                // Ignore JSON parse error if body is empty
            }
        }

        // 1. Authenticate via Bearer Token OR Query Parameter
        let apiKey = searchParams.get('token') || searchParams.get('apiKey');

        if (!apiKey) {
            const authHeader = req.headers.get('authorization');
            if (authHeader && authHeader.startsWith('Bearer ')) {
                apiKey = authHeader.split(' ')[1];
            }
        }

        if (!apiKey) {
            return NextResponse.json({ error: 'Missing API Key in URL (?token=...) or Authorization header' }, { status: 401 });
        }

        const tenant = await prisma.tenant.findUnique({
            where: { apiKey }
        });

        if (!tenant) {
            return NextResponse.json({ error: 'Invalid API Key' }, { status: 401 });
        }

        // Discard unreplaced Yay.com macros like {caller_id} from the URL
        if (phone && !phone.match(/[0-9]/)) {
            phone = null;
        }



        // Clean phone number (remove non-digits / spaces)
        let cleanPhone = phone ? phone.replace(/[^0-9+]/g, '') : null;

        if (!cleanPhone || cleanPhone.length < 5) {
            return NextResponse.json({ error: 'Missing or invalid phone parameter' }, { status: 400 });
        }

        // 3. Handle Answered or Hangup Events

        if (eventType === 'answered' || eventType === 'hungup') {
            await prisma.incomingCall.updateMany({
                where: { tenantId: tenant.id, phone: cleanPhone, status: 'RINGING' },
                data: { status: 'DISMISSED' }
            });
            revalidatePath('/api/dispatch/calls/active');
            return NextResponse.json({ success: true, action: 'cleared', phone: cleanPhone });
        }

        // 4. Prevent duplicate "ringing" states by dismissing any stale calls for this number
        await prisma.incomingCall.updateMany({
            where: {
                tenantId: tenant.id,
                phone: cleanPhone,
                status: 'RINGING'
            },
            data: {
                status: 'DISMISSED'
            }
        });

        // 5. Create Incoming Call Record
        const incomingCall = await prisma.incomingCall.create({
            data: {
                tenantId: tenant.id,
                phone: cleanPhone,
                status: 'RINGING' // Default
            }
        });

        revalidatePath('/api/dispatch/calls/active');
        return NextResponse.json({ success: true, callId: incomingCall.id, phone: cleanPhone }, { status: 201 });

    } catch (error) {
        console.error('Webhook Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
