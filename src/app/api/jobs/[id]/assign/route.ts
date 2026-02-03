
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from "@/auth";

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const session = await auth();
        if (!session?.user?.tenantId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const jobId = parseInt(id);
        const { driverId } = await req.json();

        // Transaction: Update Job + Update Driver Status
        const [updatedJob] = await prisma.$transaction([
            prisma.job.update({
                where: { id: jobId },
                data: {
                    driverId,
                    status: 'DISPATCHED'
                }
            }),
            prisma.driver.update({
                where: { id: driverId },
                data: { status: 'BUSY' }
            })
        ]);

        return NextResponse.json(updatedJob);
    } catch (error) {
        console.error("Assign failed", error);
        return NextResponse.json({ error: 'Assignment Failed' }, { status: 500 });
    }
}
