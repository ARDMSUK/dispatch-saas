import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
    try {
        // 1. Authentication via Bearer Token (API Key)
        const authHeader = req.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Missing or invalid Authorization header. Expected Format: Bearer <API_KEY>' }, { status: 401 });
        }

        const apiKey = authHeader.split(' ')[1];

        const tenant = await prisma.tenant.findUnique({
            where: { apiKey }
        });

        if (!tenant) {
            return NextResponse.json({ error: 'Invalid API Key' }, { status: 403 });
        }

        // 2. Parse Body Payload
        const body = await req.json();

        // Basic requirement checks
        if (!body.pickupAddress || !body.dropoffAddress || !body.pickupTime || !body.passengerName || !body.passengerPhone) {
            return NextResponse.json({
                error: 'Missing required fields',
                required: ['pickupAddress', 'dropoffAddress', 'pickupTime', 'passengerName', 'passengerPhone']
            }, { status: 400 });
        }

        // 3. Construct the Job
        const newJob = await prisma.job.create({
            data: {
                tenantId: tenant.id,
                status: 'PENDING',

                pickupAddress: body.pickupAddress,
                dropoffAddress: body.dropoffAddress,
                pickupLat: body.pickupLat || null,
                pickupLng: body.pickupLng || null,
                dropoffLat: body.dropoffLat || null,
                dropoffLng: body.dropoffLng || null,
                pickupTime: new Date(body.pickupTime),

                passengerName: body.passengerName,
                passengerPhone: body.passengerPhone,
                passengers: body.passengers || 1,
                luggage: body.luggage || 0,
                vehicleType: body.vehicleType || 'Saloon',
                flightNumber: body.flightNumber || null,
                notes: body.notes ? `[API Ingested] ${body.notes}` : '[API Ingested]',

                paymentType: body.paymentType || 'CASH',
                fare: body.fare || null
            }
        });

        return NextResponse.json({
            success: true,
            message: 'Booking successfully ingested via API',
            jobId: newJob.id,
            status: newJob.status
        }, { status: 201 });

    } catch (error: any) {
        console.error("POST /api/v1/bookings error:", error);
        return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
    }
}
