import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { getStripe, systemStripe } from '@/lib/stripe';

export async function POST(
    request: Request,
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

        // Verify Job Ownership
        const job = await prisma.job.findUnique({
            where: { id },
            include: { customer: true, tenant: true }
        });

        if (!job || !job.tenant) {
            return NextResponse.json({ error: 'Job or tenant not found' }, { status: 404 });
        }

        // Check tenant isolation (Super Admin logic could be added here if needed, but safe to restrict to tenant)
        if (job.tenantId !== session.user.tenantId && session.user.role !== 'SUPER_ADMIN') {
            return NextResponse.json({ error: 'Forbidden: You are not authorized for this job' }, { status: 403 });
        }

        // Prevent generating a session if already paid
        if (job.paymentStatus === 'PAID') {
            return NextResponse.json({ error: 'Job is already paid', isPaid: true }, { status: 400 });
        }

        // Reuse existing Stripe payment link if unpaid
        if (job.paymentLink && job.paymentProvider === 'STRIPE' && !job.paymentLink.includes('sumup')) {
            return NextResponse.json({
                success: true,
                url: job.paymentLink,
                reused: true
            });
        }

        // Validate fare amount
        if (job.fare === null || job.fare === undefined || isNaN(job.fare) || job.fare <= 0) {
            return NextResponse.json({ error: 'Invalid or missing fare amount for this job' }, { status: 400 });
        }

        const tenant = job.tenant;
        const stripeClient = tenant.stripeSecretKey ? getStripe(tenant.stripeSecretKey) : systemStripe;

        if (!stripeClient) {
            return NextResponse.json({ error: 'Stripe is not configured for this tenant' }, { status: 500 });
        }

        // Base App URL
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.cabai.co.uk';
        const successUrl = `${baseUrl}/payment-success`;

        // Create Checkout Session
        const stripeSession = await stripeClient.checkout.sessions.create({
            payment_method_types: ['card', 'link', 'apple_pay', 'google_pay'],
            line_items: [
                {
                    price_data: {
                        currency: 'gbp',
                        product_data: {
                            name: `Booking #${job.id} - ${tenant.name}`,
                            description: `${job.pickupAddress} to ${job.dropoffAddress}`,
                        },
                        unit_amount: Math.round((job.fare || 0) * 100), // convert to pence
                    },
                    quantity: 1,
                },
            ],
            mode: 'payment',
            success_url: successUrl,
            client_reference_id: job.id.toString(),
            metadata: {
                jobId: job.id.toString(),
                tenantId: tenant.id.toString(),
                paymentType: "job_payment"
            }
        });

        if (!stripeSession.url) {
             return NextResponse.json({ error: 'Failed to generate checkout session' }, { status: 500 });
        }

        // Save the generated link and update provider to STRIPE, but do NOT mark as paid
        await prisma.job.update({
            where: { id: job.id },
            data: {
                paymentLink: stripeSession.url,
                paymentProvider: 'STRIPE'
            }
        });

        return NextResponse.json({ 
            success: true, 
            url: stripeSession.url,
            reused: false
        });

    } catch (error) {
        console.error("POST /api/jobs/[id]/payment-link error:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
