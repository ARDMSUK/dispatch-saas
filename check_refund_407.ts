import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
  const job407 = await prisma.job.findUnique({ where: { id: 407 } });
  console.log("Job 407:", JSON.stringify(job407, null, 2));

  const job406 = await prisma.job.findUnique({ where: { id: 406 } });
  console.log("Job 406 paymentStatus:", job406?.paymentStatus);

  await prisma.$disconnect();
}
check();
