import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
  const jobs = await prisma.job.findMany({
    orderBy: { bookedAt: 'desc' },
    take: 5
  });
  console.log("Most recent jobs in DB:", jobs.map(j => ({ id: j.id, passengerName: j.passengerName, bookedAt: j.bookedAt })));
  await prisma.$disconnect();
}
run();
