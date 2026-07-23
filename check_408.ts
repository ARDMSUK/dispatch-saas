import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
  const job = await prisma.job.findUnique({
    where: { id: 408 }
  });
  console.log("Job 408:", JSON.stringify(job, null, 2));

  const driver = await prisma.driver.findUnique({
    where: { id: 'cmotmmref0001gpsg8a1ju85m' }
  });
  console.log("Driver status:", driver?.status);

  await prisma.$disconnect();
}
run();
