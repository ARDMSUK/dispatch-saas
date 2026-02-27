import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// This is an external webhook intended to be called by a PBX (Twilio, 3CX, etc)
// It authenticates via a Bearer token matching the Tenant's ApiKey

const WebhookSchema = z.object({
    phone: z.string().min(1)
});

export async function POST(req: Request) {
    try {
        // 1. Authenticate via Bearer Token (Tenant API Key)
        const authHeader = req.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Missing or invalid Authorization header' }, { status: 401 });
        }

        const apiKey = authHeader.split(' ')[1];

        const tenant = await prisma.tenant.findUnique({
            where: { apiKey }
        });

        if (!tenant) {
            return NextResponse.json({ error: 'Invalid API Key' }, { status: 401 });
        }

        // 2. Validate payload
        const body = await req.json();
        const validation = WebhookSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json({ error: 'Invalid payload', details: validation.error }, { status: 400 });
        }

        // 3. Create Incoming Call Record
        const incomingCall = await prisma.incomingCall.create({
            data: {
                tenantId: tenant.id,
                phone: validation.data.phone,
                status: 'RINGING' // Default
            }
        });

        return NextResponse.json({ success: true, callId: incomingCall.id }, { status: 201 });

    } catch (error) {
        console.error('Webhook Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
