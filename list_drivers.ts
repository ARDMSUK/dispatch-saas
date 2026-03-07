import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const drivers = await prisma.driver.findMany({ include: { tenant: true } });
  console.log(drivers.map(d => ({ tenant: d.tenant.slug, callsign: d.callsign, name: d.name })));
}
main().catch(console.error).finally(() => prisma.$disconnect());
