import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const tenants = await prisma.tenant.findMany();
  console.log('Tenants:', tenants.map(t => t.slug));
  const drivers = await prisma.driver.findMany();
  console.log('Drivers:', drivers);
}
main().catch(console.error).finally(() => prisma.$disconnect());
