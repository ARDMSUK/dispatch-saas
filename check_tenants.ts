import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const tenants = await prisma.tenant.findMany({
    select: {
      id: true,
      name: true,
      stripeSecretKey: true,
      stripePublishableKey: true
    }
  });
  console.log(tenants);
}

main().catch(console.error).finally(() => prisma.$disconnect());
