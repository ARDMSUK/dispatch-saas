import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
  const jobs = await prisma.job.findMany({
    where: { 
      passengerPhone: '07970586381',
      passengerEmail: 'ar.uk@me.com'
    },
    orderBy: { bookedAt: 'desc' },
    take: 5
  });
  console.log("Recent jobs:", JSON.stringify(jobs, null, 2));

  await prisma.$disconnect();
}
run();
