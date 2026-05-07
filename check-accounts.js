const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const accounts = await prisma.account.findMany();
  console.log("Total Accounts:", accounts.length);
  console.log(accounts.map(a => ({ id: a.id, name: a.name, isActive: a.isActive, tenantId: a.tenantId })));
}

check().catch(console.error).finally(() => prisma.$disconnect());
