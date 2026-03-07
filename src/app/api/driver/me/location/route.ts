import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyMobileToken } from '@/lib/mobile-auth';

export async function PATCH(request: Request) {
    try {
        const authHeader = request.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const token = authHeader.split(' ')[1];
        const payload = await verifyMobileToken(token);

        if (!payload || (!payload.id && !payload.driverId)) {
            return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
        }

        const driverId = payload.driverId || payload.id;

        const body = await request.json();
        const { lat, lng } = body;

        if (typeof lat !== 'number' || typeof lng !== 'number') {
            return NextResponse.json({ error: 'Invalid coordinates' }, { status: 400 });
        }

        // Update the driver's current location in DB
        const updatedDriver = await prisma.driver.update({
            where: { id: driverId as string },
            data: {
                currentLat: lat,
                currentLng: lng,
                lastLocationUpdate: new Date()
            }
        });

        // Optionally, if they are on an active job, you might broadcast their location 
        // via Pusher/WebSockets to the customer app here.

        return NextResponse.json({ success: true, location: { lat, lng } });

    } catch (error) {
        console.error('Error updating driver location:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
