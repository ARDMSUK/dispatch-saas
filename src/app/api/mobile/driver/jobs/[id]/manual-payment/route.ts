import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getDriverSession } from '@/lib/driver-auth';

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const driver = await getDriverSession(req);
        if (!driver) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const jobId = parseInt(id);
        if (isNaN(jobId)) {
            return NextResponse.json({ error: "Invalid Job ID" }, { status: 400 });
        }

        const body = await req.json();
        const { method } = body;

        if (!['CASH', 'SUMUP', 'ZETTLE', 'OTHER_TERMINAL'].includes(method)) {
            return NextResponse.json({ error: "Invalid manual payment method" }, { status: 400 });
        }

        const job = await prisma.job.findUnique({
            where: { id: jobId }
        });

        if (!job) {
            return NextResponse.json({ error: "Job not found" }, { status: 404 });
        }

        // Verify ownership
        if (job.driverId !== driver.driverId) {
            return NextResponse.json({ error: "Not assigned to this job" }, { status: 403 });
        }

        // Reject if already paid/refunded/cancelled
        if (job.paymentStatus === 'PAID') {
            return NextResponse.json({ error: "Job is already paid" }, { status: 400 });
        }
        if (job.paymentStatus === 'REFUNDED') {
            return NextResponse.json({ error: "Job has been refunded" }, { status: 400 });
        }
        if (job.status === 'CANCELLED') {
            return NextResponse.json({ error: "Job is cancelled" }, { status: 400 });
        }

        let newPaymentType = 'CASH';
        let newPaymentProvider = 'CASH';

        if (method === 'SUMUP') {
            newPaymentType = 'CARD';
            newPaymentProvider = 'SUMUP';
        } else if (method === 'ZETTLE') {
            newPaymentType = 'CARD';
            newPaymentProvider = 'ZETTLE';
        } else if (method === 'OTHER_TERMINAL') {
            newPaymentType = 'CARD';
            newPaymentProvider = 'OTHER_TERMINAL';
        }

        const timestamp = new Date().toLocaleString();
        const noteAddition = `\n[System] Manual ${method === 'CASH' ? 'cash' : method + ' terminal'} payment confirmed by driver on ${timestamp}.`;
        const updatedNotes = (job.notes || '') + noteAddition;

        const updatedJob = await prisma.job.update({
            where: { id: jobId },
            data: {
                paymentStatus: 'PAID',
                paymentType: newPaymentType,
                paymentProvider: newPaymentProvider,
                status: 'COMPLETED', // Complete the job as the previous flow did
                notes: updatedNotes
            }
        });

        // Free the driver
        await prisma.driver.update({
            where: { id: driver.driverId },
            data: { status: 'FREE' }
        });

        return NextResponse.json({ success: true, job: updatedJob });

    } catch (error) {
        console.error("Manual payment error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
