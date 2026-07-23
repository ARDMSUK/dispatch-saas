import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
  const job = await prisma.job.findFirst({
    where: { passengerName: "TEST 20F WEB CASH" },
    orderBy: { bookedAt: 'desc' }
  });
  console.log("Job 20F-3:", JSON.stringify(job, null, 2));

  const driver = await prisma.driver.findUnique({
    where: { id: 'cmotmmref0001gpsg8a1ju85m' }
  });
  console.log("Driver status:", driver?.status);

  await prisma.$disconnect();
}
run();
