import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const UpdateJobSchema = z.object({
    status: z.enum([
        "PENDING",
        "UNASSIGNED",
        "DISPATCHED",
        "EN_ROUTE",
        "POB",
        "COMPLETED",
        "CANCELLED",
        "NO_SHOW"
    ]).optional(),
    driverId: z.string().optional().nullable(),
    fare: z.number().optional(),
    pickupAddress: z.string().optional(),
    dropoffAddress: z.string().optional(),
    pickupTime: z.string().optional(),
    passengerName: z.string().optional(),
    passengerPhone: z.string().optional(),
    vehicleType: z.string().optional(),
    notes: z.string().optional().nullable(),
    paymentType: z.enum(["CASH", "CARD", "ACCOUNT"]).optional(),
    passengers: z.number().optional(),
    luggage: z.number().optional(),
    flightNumber: z.string().optional().nullable(),
    preAssignedDriverId: z.string().optional().nullable(),
});

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const body = await request.json();
        const validation = UpdateJobSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json({ error: 'Invalid data', details: validation.error }, { status: 400 });
        }

        const { status, driverId, fare } = validation.data;
        const { id } = await params;
        const jobId = parseInt(id);

        if (isNaN(jobId)) {
            return NextResponse.json({ error: 'Invalid Job ID' }, { status: 400 });
        }

        const updatedJob = await prisma.job.update({
            where: { id: jobId },
            data: {
                ...(status && { status }),
                ...(driverId !== undefined && { driverId }), // Allow null
                ...(fare && { fare }),
                ...(validation.data.pickupAddress && { pickupAddress: validation.data.pickupAddress }),
                ...(validation.data.dropoffAddress && { dropoffAddress: validation.data.dropoffAddress }),
                ...(validation.data.pickupTime && { pickupTime: validation.data.pickupTime }),
                ...(validation.data.passengerName && { passengerName: validation.data.passengerName }),
                ...(validation.data.passengerPhone && { passengerPhone: validation.data.passengerPhone }),
                ...(validation.data.vehicleType && { vehicleType: validation.data.vehicleType }),
                ...(validation.data.notes !== undefined && { notes: validation.data.notes }),
                ...(validation.data.paymentType && { paymentType: validation.data.paymentType }),
                ...(validation.data.passengers && { passengers: validation.data.passengers }),
                ...(validation.data.luggage !== undefined && { luggage: validation.data.luggage }),
                ...(validation.data.flightNumber !== undefined && { flightNumber: validation.data.flightNumber }),
                ...(validation.data.preAssignedDriverId !== undefined && { preAssignedDriverId: validation.data.preAssignedDriverId }),
            },
            include: {
                driver: true
            }
        });

        return NextResponse.json(updatedJob);
    } catch (error) {
        console.error('Error updating job:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
