import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyMobileToken } from '@/lib/mobile-auth';

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "OPTIONS,PATCH",
    "Access-Control-Allow-Headers": "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization",
};

export async function OPTIONS() {
    return new Response(null, { status: 204, headers: corsHeaders });
}

export async function PATCH(request: Request) {
    try {
        const authHeader = request.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
        }

        const token = authHeader.split(' ')[1];
        const payload = await verifyMobileToken(token);

        if (!payload || (!payload.id && !payload.driverId)) {
            return NextResponse.json({ error: 'Invalid token' }, { status: 401, headers: corsHeaders });
        }

        const driverId = payload.driverId || payload.id;

        const body = await request.json();
        const { expoPushToken } = body;

        if (!expoPushToken || typeof expoPushToken !== 'string') {
            return NextResponse.json({ error: 'Valid expoPushToken required' }, { status: 400, headers: corsHeaders });
        }

        // Update the driver's token
        const updatedDriver = await prisma.driver.update({
            where: { id: driverId as string },
            data: { expoPushToken },
        });

        return NextResponse.json({ success: true, driverId: updatedDriver.id }, { headers: corsHeaders });

    } catch (error) {
        console.error('Error updating driver push token:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500, headers: corsHeaders }
        );
    }
}
