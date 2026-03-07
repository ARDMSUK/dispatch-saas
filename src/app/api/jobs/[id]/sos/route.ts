import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Expo } from 'expo-server-sdk';
import { getDriverSession } from '@/lib/driver-auth';

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
    return new Response(null, { status: 204, headers: corsHeaders });
}

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const jobId = parseInt(id);

        if (isNaN(jobId)) {
            return NextResponse.json({ error: 'Invalid Job ID' }, { status: 400, headers: corsHeaders });
        }

        const body = await req.json().catch(() => ({}));
        const source = body.source || 'Unknown'; // 'CUSTOMER' or 'DRIVER'
        const lat = body.lat;
        const lng = body.lng;

        // Verify Job exists
        const job = await prisma.job.findUnique({
            where: { id: jobId },
            include: { tenant: true, driver: true, customer: true }
        });

        if (!job) {
            return NextResponse.json({ error: 'Job not found' }, { status: 404, headers: corsHeaders });
        }

        // Toggle or Set SOS
        await prisma.job.update({
            where: { id: jobId },
            data: { emergencyActive: true }
        });

        // Broadcast to Tenant Admins
        const admins = await prisma.user.findMany({
            where: {
                tenantId: job.tenantId,
                role: 'ADMIN'
            }
        });

        // NOTE: In a real system, we'd send SMS to authorities or a 24/7 hotline here.
        // For demonstration, we'll log it and attempt to send Expo push notifications if 'ExpoPushToken' was added to Users
        const expo = new Expo();
        const messages: any[] = [];

        let alertContext = source === 'DRIVER' && job.driver ? `Driver ${job.driver.name}` : `Passenger ${job.passengerName}`;
        let locationContext = lat && lng ? ` at roughly ${lat}, ${lng}` : ` near ${job.pickupAddress}`;

        console.error(`🚨 SOS ALERT FOR JOB ${job.id}: ${alertContext} triggered the emergency panic button${locationContext}.`);

        // Example push to Admins (if we had expo push tokens on User standard accounts)
        /*
        for (let admin of admins) {
            if (admin.expoPushToken && Expo.isExpoPushToken(admin.expoPushToken)) {
                messages.push({
                    to: admin.expoPushToken,
                    title: '🚨 EMERGENCY SOS 🚨',
                    body: `${alertContext} triggered SOS! Active Job #${job.id}`,
                    data: { jobId: job.id, type: 'SOS' },
                    priority: 'high',
                    sound: 'default'
                });
            }
        }
        if (messages.length > 0) {
            try { await expo.sendPushNotificationsAsync(messages); } catch(e) { console.error('Push failed', e); }
        }
        */

        return NextResponse.json({ success: true, message: 'Emergency dispatch triggered' }, { headers: corsHeaders });

    } catch (error) {
        console.error('Error triggering SOS:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: corsHeaders });
    }
}
