import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { broadcastOperatorPresence } from '@/lib/supabase-broadcast';

export const dynamic = 'force-dynamic';

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
        let toPhone: string | null = searchParams.get('to') || searchParams.get('called');
        let answeredByExt: string | null = searchParams.get('answered_by') || searchParams.get('answeredBy') || searchParams.get('ext');
        let body: any = null;

        if (req.method === 'POST') {
            try {
                body = await req.json();
                phone = body.phone || body.caller || body.from || body.caller_id || phone;
                toPhone = body.to || body.called || toPhone;
                answeredByExt = body.answered_by ? String(body.answered_by) : (body.ext ? String(body.ext) : answeredByExt);

                // Support Yay.com specific event types in the JSON payload
                if (body.type) {
                    const typeStr = String(body.type).toLowerCase();
                    if (typeStr.includes('answered')) {
                        eventType = 'answered';
                    } else if (typeStr.includes('hungup') || typeStr.includes('hangup')) {
                        eventType = 'hungup';
                    }
                } else if (body.answered_at || body.answer_type || body.answered_by) {
                    // Fallback for Yay.com 'Call Answered' webhooks which often omit 'type'
                    eventType = 'answered';
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

        let tenant = null;

        if (apiKey) {
            tenant = await prisma.tenant.findUnique({
                where: { apiKey }
            });
        }

        // 2. Fallback: Dynamic Routing via "To" Phone Number
        if (!tenant && toPhone) {
            const cleanToPhone = toPhone.replace(/[^0-9]/g, '');
            if (cleanToPhone.length >= 9) {
                const tenantsWithPhone = await prisma.tenant.findMany({
                    where: {
                        OR: [
                            { phone: { not: null } },
                            { twilioFromNumber: { not: null } }
                        ]
                    }
                });
                
                const targetSuffix = cleanToPhone.slice(-10); // Match last 10 digits
                
                tenant = tenantsWithPhone.find(t => {
                    const matchPhone = t.phone ? t.phone.replace(/[^0-9]/g, '').endsWith(targetSuffix) : false;
                    const matchTwilio = t.twilioFromNumber ? t.twilioFromNumber.replace(/[^0-9]/g, '').endsWith(targetSuffix) : false;
                    return matchPhone || matchTwilio;
                }) || null;
            }
        }

        if (!tenant) {
            return NextResponse.json({ error: 'Could not identify tenant from API Key or Inbound Phone Number' }, { status: 401 });
        }

        // Discard unreplaced Yay.com macros like {caller_id} from the URL
        if (phone && !phone.match(/[0-9]/)) {
            phone = null;
        }



        // Clean phone number (remove non-digits / spaces)
        const cleanPhone = phone ? phone.replace(/[^0-9+]/g, '') : null;

        if (!cleanPhone || cleanPhone.length < 5) {
            return NextResponse.json({ error: 'Missing or invalid phone parameter' }, { status: 400 });
        }

        // 3. Handle Answered or Hangup Events

        if (eventType === 'answered') {
            const ringingCall = await prisma.incomingCall.findFirst({
                where: { tenantId: tenant.id, phone: cleanPhone, status: 'RINGING' },
                orderBy: { createdAt: 'desc' }
            });

            let answeredById = null;
            let answeredUser = null;

            if (answeredByExt) {
                answeredUser = await prisma.user.findFirst({
                    where: { tenantId: tenant.id, sipExtension: answeredByExt }
                });
                if (answeredUser) {
                    answeredById = answeredUser.id;
                    await prisma.user.update({
                        where: { id: answeredUser.id },
                        data: {
                            presenceStatus: 'BUSY',
                            lastPresenceUpdate: new Date()
                        }
                    });

                    await broadcastOperatorPresence({
                        userId: answeredUser.id,
                        tenantId: tenant.id,
                        name: answeredUser.name,
                        sipExtension: answeredUser.sipExtension,
                        status: 'BUSY',
                        activeCallPhone: cleanPhone
                    });
                }
            }

            if (ringingCall) {
                await prisma.incomingCall.update({
                    where: { id: ringingCall.id },
                    data: {
                        status: 'ANSWERED',
                        answeredByExt,
                        answeredById,
                        answeredAt: new Date()
                    }
                });
            } else {
                await prisma.incomingCall.updateMany({
                    where: { tenantId: tenant.id, phone: cleanPhone, status: 'RINGING' },
                    data: {
                        status: 'ANSWERED',
                        answeredByExt,
                        answeredById,
                        answeredAt: new Date()
                    }
                });
            }

            revalidatePath('/api/dispatch/calls/active');
            return NextResponse.json({ success: true, action: 'answered', phone: cleanPhone, answeredByExt });
        }

        if (eventType === 'hungup') {
            const recordingUrl = body?.recording_url || body?.recording || searchParams.get('recording') || searchParams.get('recording_url') || null;
            const durationStr = body?.duration || searchParams.get('duration');
            const duration = durationStr ? parseInt(String(durationStr), 10) : null;

            const activeCall = await prisma.incomingCall.findFirst({
                where: {
                    tenantId: tenant.id,
                    phone: cleanPhone,
                    status: { in: ['RINGING', 'ANSWERED'] }
                },
                orderBy: {
                    createdAt: 'desc'
                }
            });

            if (activeCall) {
                const nextStatus = activeCall.status === 'RINGING' ? 'DISMISSED' : 'ANSWERED';
                const updatedCall = await prisma.incomingCall.update({
                    where: { id: activeCall.id },
                    data: {
                        status: nextStatus,
                        recordingUrl,
                        duration
                    }
                });

                if (updatedCall.answeredById) {
                    const activeUser = await prisma.user.findUnique({
                        where: { id: updatedCall.answeredById }
                    });

                    if (activeUser && activeUser.presenceStatus === 'BUSY') {
                        await prisma.user.update({
                            where: { id: activeUser.id },
                            data: {
                                presenceStatus: 'ONLINE',
                                lastPresenceUpdate: new Date()
                            }
                        });

                        await broadcastOperatorPresence({
                            userId: activeUser.id,
                            tenantId: tenant.id,
                            name: activeUser.name,
                            sipExtension: activeUser.sipExtension,
                            status: 'ONLINE'
                        });
                    }
                } else if (answeredByExt) {
                    const activeUser = await prisma.user.findFirst({
                        where: { tenantId: tenant.id, sipExtension: answeredByExt }
                    });
                    if (activeUser && activeUser.presenceStatus === 'BUSY') {
                        await prisma.user.update({
                            where: { id: activeUser.id },
                            data: {
                                presenceStatus: 'ONLINE',
                                lastPresenceUpdate: new Date()
                            }
                        });
                        await broadcastOperatorPresence({
                            userId: activeUser.id,
                            tenantId: tenant.id,
                            name: activeUser.name,
                            sipExtension: activeUser.sipExtension,
                            status: 'ONLINE'
                        });
                    }
                }
            }
            revalidatePath('/api/dispatch/calls/active');
            return NextResponse.json({ success: true, action: 'hungup', phone: cleanPhone, recordingUrl, duration });
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
