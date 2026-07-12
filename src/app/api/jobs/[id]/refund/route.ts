import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { getStripe, systemStripe } from '@/lib/stripe';
import Stripe from 'stripe';

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const jobId = parseInt(id);

        if (isNaN(jobId)) {
            return NextResponse.json({ error: 'Invalid Job ID' }, { status: 400 });
        }

        const job = await prisma.job.findUnique({
            where: { id: jobId },
            include: { tenant: true }
        });

        if (!job || !job.tenant) {
            return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
        }

        if (job.tenantId !== session.user.tenantId) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        if (job.paymentStatus !== 'PAID') {
            return NextResponse.json({ error: 'Cannot refund a job that is not PAID' }, { status: 400 });
        }

        if (job.paymentProvider !== 'STRIPE') {
            return NextResponse.json({ error: 'Can only automatically refund STRIPE payments' }, { status: 400 });
        }

        let paymentReferenceId = job.paymentReferenceId || job.stripePaymentIntentId;

        if (!paymentReferenceId) {
            return NextResponse.json({ error: 'Missing Stripe payment reference ID' }, { status: 400 });
        }

        let validTenantKey = null;
        const tenant = job.tenant;
        if (tenant.stripeSecretKey) {
            if (tenant.stripeSecretKey.startsWith('sk_live_') || 
                tenant.stripeSecretKey.startsWith('sk_test_') || 
                tenant.stripeSecretKey.startsWith('rk_live_') || 
                tenant.stripeSecretKey.startsWith('rk_test_')) {
                validTenantKey = tenant.stripeSecretKey;
            }
        }

        const stripeClient = validTenantKey ? getStripe(validTenantKey) : null;

        if (!stripeClient) {
            return NextResponse.json({ error: 'Card payments are not configured for this operator.' }, { status: 400 });
        }

        let paymentIntentId = paymentReferenceId;
        
        async function getPaymentIntent(client: Stripe): Promise<Stripe.PaymentIntent | null> {
            try {
                if (paymentReferenceId!.startsWith('cs_')) {
                    const checkoutSession = await client.checkout.sessions.retrieve(paymentReferenceId!);
                    if (checkoutSession.payment_intent && typeof checkoutSession.payment_intent === 'string') {
                        return await client.paymentIntents.retrieve(checkoutSession.payment_intent, { expand: ['latest_charge'] });
                    }
                    return null;
                } else if (paymentReferenceId!.startsWith('pi_')) {
                    return await client.paymentIntents.retrieve(paymentReferenceId!, { expand: ['latest_charge'] });
                }
                return null;
            } catch (err: any) {
                if (err?.raw?.code === 'resource_missing') {
                    return null;
                }
                throw err;
            }
        }

        let intent: Stripe.PaymentIntent | null = null;
        let activeStripeClient = stripeClient;

        // Try primary client
        try {
            intent = await getPaymentIntent(activeStripeClient);
        } catch (err) {
            console.error('Error fetching PI with primary key', err);
        }



        if (!intent) {
            return NextResponse.json({ error: 'Payment Intent not found on Stripe. Invalid reference format or incorrect Stripe account.' }, { status: 400 });
        }

        paymentIntentId = intent.id;

        // Double refund prevention using Stripe data
        let alreadyRefunded = false;
        let requiresManualReview = false;
        
        const charge = intent.latest_charge as Stripe.Charge | undefined;
        if (charge && typeof charge !== 'string') {
            if (charge.refunded === true || charge.amount_refunded >= charge.amount) {
                alreadyRefunded = true;
            } else if (charge.amount_refunded > 0 && charge.amount_refunded < charge.amount) {
                requiresManualReview = true;
            }
        } else if ((intent as any).charges?.data && (intent as any).charges.data.length > 0) {
            const firstCharge = (intent as any).charges.data[0];
            if (firstCharge.refunded === true || firstCharge.amount_refunded >= firstCharge.amount) {
                alreadyRefunded = true;
            } else if (firstCharge.amount_refunded > 0 && firstCharge.amount_refunded < firstCharge.amount) {
                requiresManualReview = true;
            }
        }

        if (requiresManualReview) {
            return NextResponse.json({ error: 'Partial refund detected on Stripe. Manual review required. Phase 2 supports full refunds only.' }, { status: 400 });
        }

        if (alreadyRefunded) {
            // Ensure local DB reflects the refunded status since Stripe says it is fully refunded
            const jobUpdateResult = await prisma.$transaction(async (tx) => {
                const jobUpdate = await tx.job.updateMany({
                    where: { 
                        id: jobId, 
                        ...(session.user.role !== 'SUPER_ADMIN' && { tenantId: session.user.tenantId }) 
                    },
                    data: {
                        paymentStatus: 'REFUNDED',
                        status: 'CANCELLED'
                    }
                });

                if (jobUpdate.count !== 1) {
                    throw new Error('JOB_UPDATE_FAILED');
                }

                if (job.driverId) {
                    const driverUpdate = await tx.driver.updateMany({
                        where: { 
                            id: job.driverId,
                            ...(session.user.role !== 'SUPER_ADMIN' && { tenantId: job.tenantId })
                        },
                        data: { status: 'FREE' }
                    });

                    if (driverUpdate.count !== 1) {
                        throw new Error('DRIVER_UPDATE_FAILED');
                    }
                }
                return true;
            }).catch(e => e.message);

            if (jobUpdateResult === 'JOB_UPDATE_FAILED' || jobUpdateResult === 'DRIVER_UPDATE_FAILED') {
                console.error(`[CRITICAL] Stripe says Job ${jobId} is already refunded, but local DB sync failed (${jobUpdateResult}).`);
                return NextResponse.json({ error: 'Stripe refund is complete, but local database sync failed.' }, { status: 500 });
            }

            return NextResponse.json({ 
                success: true, 
                message: 'Payment was already refunded on Stripe. CabAI has been updated.' 
            });
        }

        try {
            // Attempt to create the refund
            const refund = await activeStripeClient.refunds.create({
                payment_intent: paymentIntentId,
            });

            if (refund.status === 'succeeded' || refund.status === 'pending') {
                // Update CabAI database
                const jobUpdateResult = await prisma.$transaction(async (tx) => {
                    const jobUpdate = await tx.job.updateMany({
                        where: { 
                            id: jobId, 
                            ...(session.user.role !== 'SUPER_ADMIN' && { tenantId: session.user.tenantId }) 
                        },
                        data: {
                            paymentStatus: 'REFUNDED',
                            status: 'CANCELLED'
                        }
                    });

                    if (jobUpdate.count !== 1) {
                        throw new Error('JOB_UPDATE_FAILED');
                    }

                    if (job.driverId) {
                        const driverUpdate = await tx.driver.updateMany({
                            where: { 
                                id: job.driverId,
                                ...(session.user.role !== 'SUPER_ADMIN' && { tenantId: job.tenantId })
                            },
                            data: { status: 'FREE' }
                        });

                        if (driverUpdate.count !== 1) {
                            throw new Error('DRIVER_UPDATE_FAILED');
                        }
                    }
                    return true;
                }).catch(e => e.message);

                if (jobUpdateResult === 'JOB_UPDATE_FAILED' || jobUpdateResult === 'DRIVER_UPDATE_FAILED') {
                    console.error(`[CRITICAL] Stripe refund succeeded for Job ${jobId}, but local DB sync failed (${jobUpdateResult}).`);
                    return NextResponse.json({ error: 'Refund succeeded with Stripe, but database sync failed.' }, { status: 500 });
                }

                return NextResponse.json({ 
                    success: true, 
                    message: 'Stripe refund created and booking cancelled' 
                });
            } else {
                return NextResponse.json({ error: `Refund creation failed with status: ${refund.status}` }, { status: 400 });
            }

        } catch (refundError: any) {
            console.error('Stripe refund creation error:', refundError?.message || refundError);
            return NextResponse.json({ error: 'Failed to process refund with Stripe. Please check Stripe dashboard.' }, { status: 400 });
        }

    } catch (error: any) {
        console.error('Error refunding job:', error?.message || error);
        return NextResponse.json({ error: 'Internal server error processing refund.' }, { status: 500 });
    }
}
