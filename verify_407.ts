import { PrismaClient } from '@prisma/client';
import { getStripe } from './src/lib/stripe';
import { decrypt } from './src/lib/encryption';

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

    const apiKey = decrypt(tenantSettings.stripeSecretKey) as string;
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
