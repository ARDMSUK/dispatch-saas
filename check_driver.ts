import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
  const driver = await prisma.driver.findFirst({ where: { status: 'ONLINE' } });
  console.log("Online driver:", JSON.stringify(driver, null, 2));
  
  const job407 = await prisma.job.findUnique({ where: { id: 407 } });
  console.log("Job 407 autoDispatch:", job407?.autoDispatch, "driverId:", job407?.driverId);

  await prisma.$disconnect();
}
check();
