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

        const job = await prisma.job.findFirst({ where: { id: jobId, driverId: driver.driverId } });

        if (!job) {
            return NextResponse.json({ error: "Job not found" }, { status: 404 });
        }

        // Verify ownership and tenant isolation
        if (job.driverId !== driver.driverId || job.tenantId !== driver.tenantId) {
            return NextResponse.json({ error: "Not assigned to this job or tenant mismatch" }, { status: 403 });
        }

        // Only allow manual payment confirmation on valid active job states
        if (!['POB', 'ARRIVED'].includes(job.status)) {
            return NextResponse.json({ error: "Manual payment can only be collected when passenger is on board or arrived" }, { status: 400 });
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
                notes: updatedNotes
                // Decoupled: We no longer set status to COMPLETED or touch paymentReferenceId
            }
        });

        // Decoupled: We no longer update the driver status to FREE here

        return NextResponse.json({ success: true, job: updatedJob });

    } catch (error) {
        console.error("Manual payment error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
