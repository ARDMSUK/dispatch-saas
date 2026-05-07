const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function test() {
  const job = await prisma.job.findUnique({
    where: { id: 199 },
    include: { driver: true }
  });
  console.log(job);
}
test().finally(() => prisma.$disconnect());
