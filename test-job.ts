import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const jobs = await prisma.job.findMany({
    orderBy: { bookedAt: 'desc' },
    take: 5
  });
  console.log("Recent Jobs:");
  console.dir(jobs, { depth: null });
}

main().catch(console.error).finally(() => prisma.$disconnect());
