import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import Stripe from 'stripe';
import { decrypt } from '@/lib/encryption';
import { getStripe } from '@/lib/stripe';
import { reconcileLateSuccessPublicBooking } from '@/lib/payment-reconciliation';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: Request) {
    try {
        // Vercel Cron Security Check - FAIL CLOSED
        const cronSecret = process.env.CRON_SECRET;
        const authHeader = req.headers.get('authorization');
        
        if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const now = new Date();
        const fifteenMinsAgo = new Date(now.getTime() - 15 * 60 * 1000);

        // Find abandoned CARD checkouts
        const ghostJobs = await prisma.job.findMany({
            where: {
                paymentType: 'CARD',
                paymentStatus: 'UNPAID',
                status: {
                    in: ['PENDING', 'UNASSIGNED'] // Only sweep jobs that haven't progressed
                },
                bookedAt: {
                    lt: fifteenMinsAgo // Older than 15 minutes
                },
                OR: [
                    { notes: { contains: '[PASSENGER_APP]' } },
                    { notes: { contains: '[WEB_BOOKER]' } }
                ]
            },
            include: {
                tenant: true
            }
        });

        if (ghostJobs.length === 0) {
            return NextResponse.json({ message: "No unpaid jobs to sweep." });
        }

        let cancelledCount = 0;
        let reconciledCount = 0;
        let failedCount = 0;

        for (const job of ghostJobs) {
            try {
                // Reconcile with Stripe first
                let canCancel = true;

                if (job.stripePaymentIntentId) {
                    if (!job.tenant.stripeSecretKey) {
                        console.error(`Sweeper: Job ${job.id} has intent ID but tenant lacks Stripe key. Skipping.`);
                        await prisma.job.update({
                            where: { id: job.id },
                            data: {
                                paymentProblemStatus: 'MISMATCH',
                                paymentProblemReason: 'Missing Stripe credentials to verify payment intent state',
                                paymentProblemAt: new Date()
                            }
                        });
                        failedCount++;
                        continue;
                    }

                    const secret = decrypt(job.tenant.stripeSecretKey) as string;
                    const stripe = getStripe(secret);
                    try {
                        const pi = await stripe.paymentIntents.retrieve(job.stripePaymentIntentId);
                        
                        if (pi.status === 'succeeded' || pi.status === 'processing') {
                            canCancel = false;
                            if (pi.status === 'succeeded') {
                                if (pi.metadata?.paymentPurpose === 'PUBLIC_BOOKING') {
                                    const reconciled = await reconcileLateSuccessPublicBooking(job.id, job.tenantId, pi, 'SWEEPER');
                                    if (reconciled) reconciledCount++;
                                }
                            }
                        } else if (['requires_payment_method', 'requires_action', 'requires_confirmation'].includes(pi.status)) {
                             try {
                                 await stripe.paymentIntents.cancel(job.stripePaymentIntentId);
                             } catch (cancelErr: any) {
                                 // Safely re-check
                                 const rePi = await stripe.paymentIntents.retrieve(job.stripePaymentIntentId);
                                 if (rePi.status === 'succeeded') {
                                     canCancel = false;
                                     if (rePi.metadata?.paymentPurpose === 'PUBLIC_BOOKING') {
                                         const reconciled = await reconcileLateSuccessPublicBooking(job.id, job.tenantId, rePi, 'SWEEPER');
                                         if (reconciled) reconciledCount++;
                                     }
                                 } else if (rePi.status === 'processing') {
                                     canCancel = false;
                                 } else {
                                     // Not fully cancelled, leave it alone to be safe
                                     canCancel = false;
                                     console.error(`Sweeper: Failed to cancel PI ${job.stripePaymentIntentId}, status is ${rePi.status}`);
                                     failedCount++;
                                 }
                             }
                        } else if (pi.status === 'canceled') {
                             canCancel = true;
                        } else {
                             canCancel = false; // default fail closed
                        }
                    } catch (e) {
                        console.error(`Sweeper failed to fetch Stripe PI ${job.stripePaymentIntentId} for Job ${job.id}`, e);
                        canCancel = false; // CRITICAL FIX: FAIL CLOSED on network/stripe error
                        failedCount++;
                    }
                }

                if (!canCancel) continue;

                // If we get here, it's genuinely abandoned or safely cancelled in Stripe
                const finalResult = await prisma.job.updateMany({
                    where: { 
                        id: job.id,
                        tenantId: job.tenantId,
                        paymentType: 'CARD',
                        paymentStatus: 'UNPAID',
                        status: { in: ['PENDING', 'UNASSIGNED'] },
                        bookedAt: { lt: fifteenMinsAgo }
                    },
                    data: {
                        status: 'CANCELLED',
                        notes: `${job.notes || ''}\n[SYSTEM] Auto-cancelled abandoned unpaid CARD booking after 15 mins.`.trim()
                    }
                });
                
                if (finalResult.count === 1) {
                    cancelledCount++;
                } else {
                    console.log(`Sweeper: Job ${job.id} state changed during processing (e.g. converted to CASH). Skipped cancellation.`);
                }
            } catch (e) {
                console.error(`Sweeper failed to process Job ${job.id}`, e);
                failedCount++;
            }
        }

        return NextResponse.json({ 
            success: true, 
            swept: cancelledCount, 
            reconciled: reconciledCount, 
            failed: failedCount 
        });

    } catch (error: any) {
        console.error('Sweeper error:', error);
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
}
