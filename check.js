import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const tenants = await prisma.tenant.findMany({
    select: {
      id: true,
      slug: true,
      stripeSecretKey: true,
      stripePublishableKey: true
    }
  });
  console.dir(tenants, { depth: null });
}
main().catch(console.error).finally(() => prisma.$disconnect());
