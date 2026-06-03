import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const session = await auth();
        if (!session?.user?.tenantId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const calls = await prisma.incomingCall.findMany({
            where: { tenantId: session.user.tenantId },
            include: {
                answeredBy: {
                    select: { name: true, email: true }
                },
                booking: {
                    select: { id: true, passengerName: true }
                }
            },
            orderBy: { createdAt: 'desc' },
            take: 100
        });

        return NextResponse.json(calls);
    } catch (error) {
        console.error('Failed to fetch call logs:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const session = await auth();
        if (!session?.user?.tenantId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { phone, status, answeredByExt, answeredById, recordingUrl, duration, transcript, summary, bookingId } = body;

        if (!phone) {
            return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });
        }

        const call = await prisma.incomingCall.create({
            data: {
                tenantId: session.user.tenantId,
                phone,
                status: status || 'RINGING',
                answeredByExt: answeredByExt || null,
                answeredById: answeredById || null,
                recordingUrl: recordingUrl || null,
                duration: duration !== undefined ? parseInt(duration) : null,
                transcript: transcript || null,
                summary: summary || null,
                bookingId: bookingId ? parseInt(bookingId) : null
            }
        });

        return NextResponse.json(call, { status: 201 });
    } catch (error) {
        console.error('Failed to create call log:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
