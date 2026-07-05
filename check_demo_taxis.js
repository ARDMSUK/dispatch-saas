const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const tenant = await prisma.tenant.findUnique({ where: { id: 'demo-taxis' } });
  if (tenant) {
    console.log("demo-taxis found! key:", tenant.stripeSecretKey ? "set" : "not set");
  } else {
    console.log("demo-taxis not found in DB");
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
