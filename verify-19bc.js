const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  try {
    const jobs = await prisma.job.findMany({
      where: { id: { in: [398, 399] } },
      orderBy: { id: 'asc' }
    });

    jobs.forEach(job => {
      console.log(`\n--- JOB ${job.id} ---`);
      console.log(`Status: ${job.status}`);
      console.log(`Payment Type: ${job.paymentType}`);
      console.log(`Payment Status: ${job.paymentStatus}`);
      console.log(`Notes: ${job.notes}`);
      console.log(`Stripe Session ID: ${job.stripeSessionId || 'null'}`);
      console.log(`Stripe PaymentIntent ID: ${job.stripePaymentIntentId || 'null'}`);
      console.log(`Payment Link: ${job.paymentLink || 'null'}`);
    });
  } catch (error) {
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

run();
