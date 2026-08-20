import { prisma } from '@/lib/prisma';
import { EmailService } from '@/lib/email-service';
import { SmsService } from '@/lib/sms-service';
import { DispatchEngine } from '@/lib/dispatch-engine';
import Stripe from 'stripe';

export async function reconcileLateSuccessPublicBooking(
    jobId: number,
    metaTenantId: string,
    intent: Stripe.PaymentIntent,
    source: 'WEBHOOK' | 'SWEEPER' | 'OPERATOR_MUTATION'
) {
    const result = await prisma.job.updateMany({
        where: {
            id: jobId,
            tenantId: metaTenantId,
            paymentStatus: 'UNPAID',
            status: { notIn: ['CANCELLED', 'COMPLETED', 'NO_SHOW'] }
        },
        data: {
            paymentStatus: 'PAID',
            paymentType: 'CARD',
            paymentProvider: 'STRIPE',
            paymentReferenceId: intent.id,
            stripePaymentIntentId: intent.id,
            stripeChargeId: intent.latest_charge as string | undefined,
            paymentProblemStatus: null,
            paymentProblemReason: null,
            paymentProblemAt: null
        }
    });

    if (result.count === 1) {
        console.log(`✅ [${source}] Marked PUBLIC Job ${jobId} as PAID. Triggering side effects.`);
        const tenant = await prisma.tenant.findUnique({ where: { id: metaTenantId } });
        if (tenant) {
            const updatedJob = await prisma.job.findUnique({ where: { id: jobId } });
            if (updatedJob) {
                if (source === 'SWEEPER') {
                    await prisma.job.update({
                        where: { id: jobId },
                        data: { notes: `${updatedJob.notes || ''}\n[SYSTEM] Reconciled PAID by sweeper (late capture).`.trim() }
                    });
                }
                if (!updatedJob.notes?.includes('[NO_NOTIFICATIONS]')) {
                    const jobWithCustomer = { ...updatedJob, customer: { email: updatedJob.passengerEmail } };
                    const notificationPromises = [
                        EmailService.sendBookingRequestReceived(jobWithCustomer as any, tenant),
                        SmsService.sendBookingRequestReceived(updatedJob, tenant),
                        EmailService.sendPaymentConfirmation(jobWithCustomer as any, tenant)
                    ];
                    Promise.allSettled(notificationPromises).catch(console.error);

                    if (updatedJob.autoDispatch) {
                        DispatchEngine.runDispatchLoop(tenant.id).catch(e => console.error("Auto dispatch run failed", e));
                    }
                }
            }
        }
        return true;
    }
    return false;
}

export async function safelyCancelUnpaidPaymentIntent(
    jobId: number,
    tenantId: string,
    stripePaymentIntentId: string,
    stripeSecretKeyEncrypted: string,
    source: 'WEBHOOK' | 'SWEEPER' | 'OPERATOR_MUTATION'
): Promise<'CANCELED' | 'PROCESSING' | 'SUCCEEDED' | 'ERROR'> {
    const { decrypt } = await import('@/lib/encryption');
    const { getStripe } = await import('@/lib/stripe');
    const secret = decrypt(stripeSecretKeyEncrypted) as string;
    const stripe = getStripe(secret);

    try {
        let pi = await stripe.paymentIntents.retrieve(stripePaymentIntentId);
        
        if (['requires_payment_method', 'requires_action', 'requires_confirmation'].includes(pi.status)) {
            try {
                await stripe.paymentIntents.cancel(stripePaymentIntentId);
            } catch (cancelErr: any) {
                // Ignore cancel error and re-verify state
            }
            pi = await stripe.paymentIntents.retrieve(stripePaymentIntentId);
        }

        if (pi.status === 'succeeded') {
            if (pi.metadata?.paymentPurpose === 'PUBLIC_BOOKING') {
                await reconcileLateSuccessPublicBooking(jobId, tenantId, pi, source);
            }
            return 'SUCCEEDED';
        } else if (pi.status === 'processing') {
            return 'PROCESSING';
        } else if (pi.status === 'canceled') {
            return 'CANCELED';
        } else {
            return 'ERROR';
        }
    } catch (e) {
        console.error(`Failed to verify/cancel Stripe PI ${stripePaymentIntentId}`, e);
        return 'ERROR';
    }
}
