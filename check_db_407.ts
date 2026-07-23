import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
  const job407 = await prisma.job.findUnique({ where: { id: 407 }, include: { tenant: true } });
  console.log(JSON.stringify(job407, null, 2));

  const job406 = await prisma.job.findUnique({ where: { id: 406 } });
  console.log("Job 406 paymentStatus:", job406?.paymentStatus);

  const drivers = await prisma.driver.count({ where: { status: 'ONLINE' } });
  console.log("Online drivers:", drivers);
  
  await prisma.$disconnect();
}
check();
