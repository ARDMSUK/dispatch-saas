const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const result = await prisma.$queryRaw`SELECT count(*) FROM pg_stat_activity;`;
  console.log(result);
}
main().catch(console.error).finally(() => prisma.$disconnect());
