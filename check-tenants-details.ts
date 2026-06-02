import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const tenants = await prisma.tenant.findMany({
    include: {
      subscriptionPlan: true
    }
  });
  console.log('--- TENANTS ---');
  for (const t of tenants) {
    console.log({
      id: t.id,
      name: t.name,
      slug: t.slug,
      hasSchoolContracts: t.hasSchoolContracts,
      incSchoolContractsPlan: t.subscriptionPlan?.incSchoolContracts
    });
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
