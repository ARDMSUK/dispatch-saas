import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
  const job = await prisma.job.findFirst({
    where: { passengerName: "TEST 20F CARD UNPAID" },
    orderBy: { bookedAt: 'desc' }
  });
  console.log("Job:", JSON.stringify(job, null, 2));
  
  await prisma.$disconnect();
}
run();
