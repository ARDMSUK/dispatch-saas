import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { SmsService } from '@/lib/sms-service';
import { auth } from '@/auth';

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session?.user?.tenantId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const id = parseInt((await params).id);
        if (isNaN(id)) {
            return NextResponse.json({ error: 'Invalid Job ID' }, { status: 400 });
        }

        let job = await prisma.job.findUnique({
            where: { id },
            include: {
                tenant: true,
                driver: true
            }
        });

        if (!job) {
            return NextResponse.json({ error: 'Job not found' }, { status: 404 });
        }

        if (!job.fare) {
            return NextResponse.json({ error: 'Job fare must be set to send a payment link' }, { status: 400 });
        }

        // Generate payment link if it does not exist
        if (!job.paymentLink) {
            const routing = job.tenant.paymentRouting;
            let accessToken = null;
            if (routing === 'CENTRAL') {
                accessToken = job.tenant.sumupAccessToken;
            } else if (routing === 'DRIVER' && job.driver) {
                accessToken = job.driver.sumupAccessToken;
            }

            if (!accessToken) {
                return NextResponse.json({ error: 'Payment integration not connected for the selected routing method' }, { status: 400 });
            }

            const dummyCheckoutId = `chk_${Math.random().toString(36).substring(7)}`;
            const paymentLink = `https://pay.sumup.io/checkout/${dummyCheckoutId}`;

            job = await prisma.job.update({
                where: { id },
                data: {
                    paymentLink,
                    paymentProvider: 'SUMUP'
                },
                include: {
                    tenant: true,
                    driver: true
                }
            });
        }

        const tenantSettings = await prisma.tenant.findUnique({
            where: { id: session.user.tenantId }
        });

        const smsResult = await SmsService.sendPaymentLink(job, tenantSettings);

        return NextResponse.json({ success: true, smsResult });
    } catch (error) {
        console.error('POST /api/jobs/[id]/payment/sms error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
