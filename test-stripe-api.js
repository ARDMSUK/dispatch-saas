const { PrismaClient } = require('@prisma/client');
const Stripe = require('stripe');
const prisma = new PrismaClient();
async function main() {
  const t = await prisma.tenant.findUnique({ where: { slug: 'bourneend' } });
  const stripe = new Stripe(t.stripeSecretKey);
  try {
      const p = await stripe.paymentIntents.list({limit: 1});
      console.log('Success!', p.data.length);
  } catch(e) {
      console.log('Error:', e.message);
  }
}
main();
