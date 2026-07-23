import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
  const job = await prisma.job.findUnique({
    where: { id: 410 },
    include: { tenant: true }
  });
  console.log("Job 410:", JSON.stringify(job, null, 2));
  await prisma.$disconnect();
}
run();
