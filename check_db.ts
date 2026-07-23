import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
  const job407 = await prisma.job.findUnique({ where: { id: 407 } });
  console.log("Job 407:", job407);

  const orphanedJobs = await prisma.job.findMany({
    where: {
      stripePaymentIntentId: { not: null }
    },
    select: { id: true, stripePaymentIntentId: true, paymentStatus: true }
  });
  console.log("Jobs with PaymentIntents:", orphanedJobs);
  
  await prisma.$disconnect();
}
check();
