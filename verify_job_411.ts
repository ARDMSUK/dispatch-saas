import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function run() {
  const job = await prisma.job.findUnique({
    where: { id: 411 },
    include: { tenant: true, driver: true, preAssignedDriver: true }
  });
  console.log("Job:", JSON.stringify(job, null, 2));
  
  if (job?.driverId) {
      const driver = await prisma.driver.findUnique({where: {id: job.driverId}});
      console.log("Driver status:", driver?.status);
  }

  await prisma.$disconnect();
}
run();
