const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const tenants = await prisma.tenant.findMany({ select: { id: true, name: true, slug: true } });
  console.log("Tenants:", tenants);
}

check().catch(console.error).finally(() => prisma.$disconnect());
