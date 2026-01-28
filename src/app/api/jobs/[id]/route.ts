import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const UpdateJobSchema = z.object({
    status: z.enum([
        "PENDING",
        "UNASSIGNED",
        "DISPATCHED",
        "EN_ROUTE",
        "POB",
        "COMPLETED",
        "CANCELLED"
    ]).optional(),
    driverId: z.string().optional(),
    fare: z.number().optional(),
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
                ...(driverId && { driverId }),
                ...(fare && { fare }),
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
