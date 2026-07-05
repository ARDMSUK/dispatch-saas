const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  try {
    const job = await prisma.job.findUnique({
      where: { id: 398 }
    });

    if (!job) {
      console.log('Job 398 not found!');
      return;
    }

    console.log('--- JOB DETAILS ---');
    console.log(`ID: ${job.id}`);
    console.log(`Status: ${job.status}`);
    console.log(`Payment Type: ${job.paymentType}`);
    console.log(`Payment Status: ${job.paymentStatus}`);
    console.log(`Notes: ${job.notes}`);
    console.log(`Stripe Session ID: ${job.stripeSessionId || 'null'}`);
    console.log(`Stripe PaymentIntent ID: ${job.stripePaymentIntentId || 'null'}`);
    console.log(`Payment Link: ${job.paymentLink || 'null'}`);
    
    // Find logs
    // Trying to guess model name, either activityLog or something. Let's just do a query on a generic log table if it exists.
    // I'll list all model names in Prisma:
    const models = Object.keys(prisma).filter(k => !k.startsWith('_') && !k.startsWith('$'));
    const logModel = models.find(m => m.toLowerCase().includes('log') || m.toLowerCase().includes('activity'));
    
    console.log('\n--- ACTIVITY LOGS ---');
    if (logModel) {
       const logs = await prisma[logModel].findMany({
         where: { jobId: 398 },
         orderBy: { createdAt: 'asc' }
       });
       logs.forEach(log => {
         console.log(`- [${log.createdAt.toISOString()}] ${log.action}: ${log.details}`);
       });
    } else {
       console.log('Log model not found among: ' + models.join(', '));
    }

  } catch (error) {
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

run();
