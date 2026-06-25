import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyMobileToken } from '@/lib/mobile-auth';
import { EmailService } from '@/lib/email-service';

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "OPTIONS,POST",
    "Access-Control-Allow-Headers": "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization",
};

export async function OPTIONS() {
    return new Response(null, { status: 204, headers: corsHeaders });
}

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
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
        const { id } = await params;
        const jobId = parseInt(id);

        if (isNaN(jobId)) {
            return NextResponse.json({ error: 'Invalid Job ID' }, { status: 400, headers: corsHeaders });
        }

        const body = await request.json();
        const { paymentType } = body;

        // Verify Job Ownership
        const job = await prisma.job.findFirst({ where: { id: jobId, driverId: driver.driverId } });

        if (!job) {
            return NextResponse.json({ error: 'Job not found' }, { status: 404, headers: corsHeaders });
        }

        if (job.driverId !== driverId) {
            return NextResponse.json({ error: 'Forbidden: You are not assigned to this job' }, { status: 403, headers: corsHeaders });
        }

        // Run updates in transaction
        const [updatedJob, updatedDriver] = await prisma.$transaction([
            prisma.job.update({
                where: { id: jobId },
                data: {
                    status: 'COMPLETED',
                    paymentType: paymentType || 'IN_CAR_TERMINAL',
                    paymentStatus: 'PAID'
                },
                include: { customer: true }
            }),
            prisma.driver.update({
                where: { id: driverId },
                data: { status: 'FREE' }
            })
        ]);

        // Trigger Receipt Notifications
        try {
            const tenantSettings = await prisma.tenant.findUnique({
                where: { id: updatedJob.tenantId }
            });
            await EmailService.sendJobReceipt(updatedJob, tenantSettings);
        } catch (notifErr) {
            console.error("Receipt email error (non-blocking):", notifErr);
        }

        return NextResponse.json({ success: true, job: updatedJob }, { headers: corsHeaders });

    } catch (error) {
        console.error("POST /api/mobile/driver/jobs/[id]/payment error:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500, headers: corsHeaders });
    }
}
