const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const jobs = await prisma.job.findMany({ orderBy: { id: 'desc' }, take: 5 });
  console.log(jobs.map(j => ({ id: j.id, status: j.status, paymentStatus: j.paymentStatus })));
}
main().catch(console.error).finally(() => prisma.$disconnect());
