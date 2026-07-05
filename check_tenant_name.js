const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const tenant = await prisma.tenant.findUnique({ where: { id: 'cmotadopt00081184tr3olkzc' } });
  console.log("Name:", tenant.name);
  console.log("Updated at:", tenant.updatedAt);
}
main().catch(console.error).finally(() => prisma.$disconnect());
