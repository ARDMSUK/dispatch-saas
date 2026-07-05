const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const Stripe = require('stripe');

async function main() {
  const tenant = await prisma.tenant.findUnique({ where: { id: 'cmotadopt00081184tr3olkzc' } });
  const apiKey = tenant.stripeSecretKey || process.env.STRIPE_SECRET_KEY;
  console.log("Using API Key starting with:", apiKey ? apiKey.substring(0, 10) : 'null');
  
  const stripe = new Stripe(apiKey);
  try {
    const pi = await stripe.paymentIntents.retrieve('pi_3TmXhBGAT4mov2QR0cSgIUFC');
    console.log(JSON.stringify({
      id: pi.id,
      status: pi.status,
      amount: pi.amount,
      currency: pi.currency,
      metadata: pi.metadata,
      customer: pi.customer,
      payment_method: pi.payment_method,
      created: pi.created,
      livemode: pi.livemode
    }, null, 2));
  } catch (err) {
    console.error("Stripe Error:", err.message);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
