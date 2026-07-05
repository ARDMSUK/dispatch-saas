const Stripe = require('stripe');
const fs = require('fs');

async function main() {
  const envVercel = fs.readFileSync('.env.vercel', 'utf8');
  const match = envVercel.match(/STRIPE_SECRET_KEY=\"(.*)\"/);
  const apiKey = match[1];
  
  const stripe = new Stripe(apiKey);
  try {
    const pi = await stripe.paymentIntents.retrieve('pi_3TmXhBGAT4mov2QR0cSgIUFC');
    console.log("Found PI!", pi.id, pi.status, pi.amount, pi.currency);
    
    // Check CabAI job
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    const job = await prisma.job.findFirst({
        where: { stripePaymentIntentId: 'pi_3TmXhBGAT4mov2QR0cSgIUFC' }
    });
    console.log("Job with PI:", job ? job.id : 'none');
    
    // check refunds
    const refunds = await stripe.refunds.list({ payment_intent: 'pi_3TmXhBGAT4mov2QR0cSgIUFC' });
    console.log("Refunds:", refunds.data.length);

    if (pi.status === 'succeeded' && pi.amount === 100 && pi.currency === 'gbp' && !job && refunds.data.length === 0) {
        console.log("Refunding...");
        const refund = await stripe.refunds.create({ payment_intent: 'pi_3TmXhBGAT4mov2QR0cSgIUFC' });
        console.log("Refund successful!", refund.id, refund.status, refund.amount);
    } else {
        console.log("Conditions not met for refund.");
    }
    
    await prisma.$disconnect();
  } catch(e) {
    console.error("Error:", e.message);
  }
}
main();
