const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  try {
    const job = await prisma.job.findUnique({
      where: { id: 400 }
    });

    if (!job) {
      console.log('Job 400 not found!');
      return;
    }

    console.log(`\n--- JOB ${job.id} ---`);
    console.log(`Status: ${job.status}`);
    console.log(`Payment Type: ${job.paymentType}`);
    console.log(`Payment Status: ${job.paymentStatus}`);
    console.log(`driverId: ${job.driverId || 'null'}`);
    console.log(`Notes: ${job.notes || 'null'}`);
    console.log(`paymentLink: ${job.paymentLink || 'null'}`);
    console.log(`stripeSessionId: ${job.stripeSessionId || 'null'}`);
    console.log(`stripePaymentIntentId: ${job.stripePaymentIntentId || 'null'}`);
    console.log(`paymentReferenceId: ${job.paymentReferenceId || 'null'}`);
  } catch (error) {
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

run();
