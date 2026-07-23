const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verify() {
  try {
    const jobs = await prisma.job.findMany({
      orderBy: { bookedAt: 'desc' },
      take: 5
    });
    console.log(JSON.stringify(jobs, null, 2));
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}
verify();
