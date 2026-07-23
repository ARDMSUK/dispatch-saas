const { PrismaClient } = require('@prisma/client');
const { getStripe } = require('./src/lib/stripe');
const prisma = new PrismaClient();

async function verify() {
  try {
    const job = await prisma.job.findUnique({
      where: { id: 407 },
      include: { tenant: true }
    });

    if (!job) {
      console.log("Job 407 not found");
      return;
    }

    console.log("Job DB Check:");
    console.log({
      id: job.id,
      tenant: job.tenant?.name,
      passengerName: job.passengerName,
      passengerEmail: job.passengerEmail,
      paymentType: job.paymentType,
      paymentStatus: job.paymentStatus,
      fare: job.fare,
      driverId: job.driverId,
      autoDispatch: job.autoDispatch,
      notes: job.notes,
      stripePaymentIntentId: job.stripePaymentIntentId,
      stripeChargeId: job.stripeChargeId,
      paymentProblemStatus: job.paymentProblemStatus
    });

    const sessionId = job.stripeCheckoutSessionId;
    if (!sessionId) {
      console.log("No Stripe session ID on job 407");
      return;
    }

    const tenantSettings = await prisma.tenant.findUnique({ where: { id: job.tenantId } });
    if (!tenantSettings || !tenantSettings.stripeSecretKey) {
      console.log("No Stripe secret key found for tenant");
      return;
    }

    const apiKey = tenantSettings.stripeSecretKey;
    const stripe = getStripe(apiKey);

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    console.log("\nStripe Session Check:");
    console.log({
      id: session.id,
      amount_total: session.amount_total,
      currency: session.currency,
      payment_status: session.payment_status,
      status: session.status,
      metadata: session.metadata,
      customer_email: session.customer_details?.email || session.customer_email,
      created: new Date(session.created * 1000).toISOString(),
      expires_at: new Date(session.expires_at * 1000).toISOString()
    });

  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}
verify();
