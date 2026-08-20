import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getStripe } from '@/lib/stripe';
import { decrypt } from '@/lib/encryption';
import { verifyPassengerToken } from '@/lib/passenger-auth';
import { SmsService } from '@/lib/sms-service';

export const dynamic = 'force-dynamic';

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,OPTIONS,PATCH,DELETE,POST,PUT",
    "Access-Control-Allow-Headers": "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization",
};

export async function OPTIONS() {
    return new Response(null, { status: 204, headers: corsHeaders });
}

export async function POST(
    req: Request,
    { params }: { params: Promise<{ slug: string, id: string }> }
) {
    try {
        const { slug, id } = await params;
        const jobId = parseInt(id);

        if (isNaN(jobId)) {
            return NextResponse.json({ error: 'Invalid Job ID' }, { status: 400, headers: corsHeaders });
        }

        const authPayload = await verifyPassengerToken(req);
        if (!authPayload) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
        }

        const tenant = await prisma.tenant.findUnique({
            where: { slug }
        });

        if (!tenant || tenant.id !== authPayload.tenantId) {
            return NextResponse.json({ error: 'Tenant mismatch or not found' }, { status: 403, headers: corsHeaders });
        }

        const jobToCheck = await prisma.job.findUnique({
            where: { id: jobId },
            include: { driver: true }
        });

        if (!jobToCheck || jobToCheck.tenantId !== tenant.id) {
            return NextResponse.json({ error: 'Job not found' }, { status: 404, headers: corsHeaders });
        }

        if (jobToCheck.customerId !== authPayload.customerId) {
            return NextResponse.json({ error: 'You do not have permission to cancel this booking' }, { status: 403, headers: corsHeaders });
        }

        // BUG 1: Atomic state transition MUST occur before issuing a refund.
        const isRetry = jobToCheck.status === 'CANCELLED';

        if (!['PENDING', 'UNASSIGNED', 'DISPATCHED', 'CANCELLED'].includes(jobToCheck.status)) {
            return NextResponse.json({ error: 'This booking cannot be cancelled from the app. Please contact the operator.' }, { status: 400, headers: corsHeaders });
        }

        if (isRetry) {
            // Narrow Retry path: only allow if ALL conditions prove this was a passenger cancellation needing refund reconciliation
            const hasPassengerCancelNote = jobToCheck.notes?.includes('[SYSTEM] Cancelled by Passenger via App.');
            const isReconcilableState = jobToCheck.paymentProblemStatus === 'REFUND_FAILED';

            if (
                jobToCheck.paymentType !== 'CARD' || 
                !jobToCheck.stripePaymentIntentId || 
                jobToCheck.paymentStatus === 'REFUNDED' ||
                !hasPassengerCancelNote ||
                !isReconcilableState
            ) {
                 return NextResponse.json({ error: 'This booking is already cancelled.' }, { status: 400, headers: corsHeaders });
            }
        }

        let jobStateAfterGate = jobToCheck;

        if (!isRetry) {
            // Atomic DB Update
            const updatedJob = await prisma.job.updateMany({
                where: {
                    id: jobId,
                    tenantId: tenant.id,
                    customerId: authPayload.customerId,
                    status: { in: ['PENDING', 'UNASSIGNED', 'DISPATCHED'] }
                },
                data: {
                    status: 'CANCELLED',
                    notes: `${jobToCheck.notes || ''}\n[SYSTEM] Cancelled by Passenger via App.`.trim()
                }
            });

            if (updatedJob.count === 0) {
                return NextResponse.json({ error: 'Booking state changed. Please contact the operator.' }, { status: 409, headers: corsHeaders });
            }

            // Fetch current job after transition to find the actual driver who needs to be released
            jobStateAfterGate = (await prisma.job.findUnique({
                where: { id: jobId },
                include: { driver: true }
            }))!;
        }

        let refundNeeded = false;
        let requiresIntentCancellation = false;
        let finalMessage = 'Booking cancelled successfully.';
        
        // Safety check for Stripe CARD jobs
        if (jobStateAfterGate.paymentType === 'CARD' && jobStateAfterGate.stripePaymentIntentId) {
            if (!tenant.stripeSecretKey) {
                 await prisma.job.update({
                     where: { id: jobId },
                     data: {
                         paymentProblemStatus: 'REFUND_FAILED',
                         paymentProblemReason: 'Missing Stripe credentials. Cannot safely verify or refund payment.',
                         paymentProblemAt: new Date()
                     }
                 });
                 finalMessage = 'Booking cancelled, but payment status could not be verified. Please contact the operator.';
            } else {
                // Real Stripe state check
                const secret = decrypt(tenant.stripeSecretKey) as string;
                const stripe = getStripe(secret);
                try {
                    const pi = await stripe.paymentIntents.retrieve(jobStateAfterGate.stripePaymentIntentId);
                    
                    if (pi.status === 'succeeded') {
                        refundNeeded = true;
                    } else if (pi.status === 'processing') {
                         await prisma.job.update({
                             where: { id: jobId },
                             data: {
                                 paymentProblemStatus: 'REFUND_FAILED',
                                 paymentProblemReason: 'Payment is still processing on Stripe.',
                                 paymentProblemAt: new Date()
                             }
                         });
                         return NextResponse.json({ 
                            success: true,
                            message: 'Booking cancelled. Payment is still processing. Please contact the operator for refund.' 
                         }, { headers: corsHeaders });
                    } else if (['requires_payment_method', 'requires_action', 'requires_confirmation'].includes(pi.status)) {
                        requiresIntentCancellation = true;
                    }
                    // 'canceled' requires no refund
                } catch (stripeError) {
                    console.error("Failed to fetch PI status during cancellation", stripeError);
                    await prisma.job.update({
                         where: { id: jobId },
                         data: {
                             paymentProblemStatus: 'REFUND_FAILED',
                             paymentProblemReason: 'Failed to retrieve Stripe intent status.',
                             paymentProblemAt: new Date()
                         }
                     });
                    finalMessage = 'Booking cancelled, but payment status could not be verified. Please contact the operator.';
                }
            }
        }

        let stripeSecret = tenant.stripeSecretKey ? (decrypt(tenant.stripeSecretKey) as string) : null;

        // Refund Processing
        if (refundNeeded && stripeSecret) {
            try {
                const stripe = getStripe(stripeSecret);
                
                await stripe.refunds.create({
                    payment_intent: jobStateAfterGate.stripePaymentIntentId!,
                    metadata: {
                        reason: 'passenger_cancellation',
                        jobId: jobId.toString()
                    }
                }, {
                    idempotencyKey: `passenger-cancel-refund-${tenant.id}-${jobId}`
                });

                await prisma.job.update({
                    where: { id: jobId },
                    data: {
                        paymentStatus: 'REFUNDED',
                        paymentProblemStatus: null,
                        paymentProblemReason: null,
                        paymentProblemAt: null,
                        notes: `${jobStateAfterGate.notes || ''}\n[SYSTEM] Auto-refunded full amount due to passenger cancellation.`.trim()
                    }
                });
            } catch (refundError: any) {
                console.error(`Refund failed for Job ${jobId}`, refundError);
                await prisma.job.update({
                    where: { id: jobId },
                    data: {
                        paymentProblemStatus: 'REFUND_FAILED',
                        paymentProblemReason: refundError.message || 'Refund attempt failed',
                        paymentProblemAt: new Date()
                    }
                });
                finalMessage = 'Booking cancelled, but automatic refund failed. Please contact the operator for assistance.';
            }
        } else if (requiresIntentCancellation && stripeSecret) {
             // BUG 2: UNPAID PAYMENTINTENT CANCEL ERROR
             try {
                const stripe = getStripe(stripeSecret);
                await stripe.paymentIntents.cancel(jobStateAfterGate.stripePaymentIntentId!);
             } catch(e: any) {
                try {
                     const stripe = getStripe(stripeSecret);
                     const pi = await stripe.paymentIntents.retrieve(jobStateAfterGate.stripePaymentIntentId!);
                     if (pi.status === 'succeeded') {
                          try {
                              await stripe.refunds.create({
                                  payment_intent: jobStateAfterGate.stripePaymentIntentId!,
                                  metadata: { reason: 'passenger_cancellation', jobId: jobId.toString() }
                              }, {
                                  idempotencyKey: `passenger-cancel-refund-${tenant.id}-${jobId}`
                              });
                              
                              await prisma.job.update({
                                  where: { id: jobId },
                                  data: {
                                      paymentStatus: 'REFUNDED',
                                      paymentProblemStatus: null,
                                      paymentProblemReason: null,
                                      paymentProblemAt: null,
                                      notes: `${jobStateAfterGate.notes || ''}\n[SYSTEM] Auto-refunded full amount due to passenger cancellation.`.trim()
                                  }
                              });
                          } catch (retryRefundErr: any) {
                               console.error(`Retry Refund failed for Job ${jobId}`, retryRefundErr);
                               await prisma.job.update({
                                    where: { id: jobId },
                                    data: {
                                        paymentProblemStatus: 'REFUND_FAILED',
                                        paymentProblemReason: retryRefundErr.message || 'Refund attempt failed after late capture',
                                        paymentProblemAt: new Date()
                                    }
                                });
                                finalMessage = 'Booking cancelled, but automatic refund failed. Please contact the operator for assistance.';
                          }
                     } else {
                         await prisma.job.update({
                            where: { id: jobId },
                            data: {
                                paymentProblemStatus: 'REFUND_FAILED',
                                paymentProblemReason: e.message || 'Failed to cancel unpaid intent',
                                paymentProblemAt: new Date()
                            }
                        });
                        finalMessage = 'Booking cancelled, but there was an issue cancelling the payment authorization. Please contact the operator.';
                     }
                } catch(retrieveErr: any) {
                    await prisma.job.update({
                        where: { id: jobId },
                        data: {
                            paymentProblemStatus: 'REFUND_FAILED',
                            paymentProblemReason: retrieveErr.message || 'Failed to retrieve intent after cancel failed',
                            paymentProblemAt: new Date()
                        }
                    });
                    finalMessage = 'Booking cancelled, but there was an issue verifying the payment authorization. Please contact the operator.';
                }
             }
        }

        // Driver cleanup
        // We only do this if it was NOT a retry (i.e. we just cancelled it)
        if (!isRetry && jobStateAfterGate.driverId) {
            await prisma.driver.update({
                where: { id: jobStateAfterGate.driverId },
                data: { status: 'FREE' }
            });
            try {
                if (jobStateAfterGate.driver && jobStateAfterGate.driver.phone) {
                    await SmsService.sendSms(jobStateAfterGate.driver.phone, `Job #${jobId} to ${jobStateAfterGate.pickupAddress} was CANCELLED by the passenger.`);
                }
            } catch (e) {
                console.error("Failed to notify driver of passenger cancellation", e);
            }
        }
        
        return NextResponse.json({ success: true, message: finalMessage }, { headers: corsHeaders });

    } catch (error: any) {
        console.error('Passenger cancel error:', error);
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500, headers: corsHeaders });
    }
}
