import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const tenant = await prisma.tenant.update({
    where: { slug: 'bourneend' },
    data: {
      hasSchoolContracts: true,
      hasDataImport: true
    }
  });
  console.log('Updated Tenant Bourne End Taxis:', {
    slug: tenant.slug,
    hasSchoolContracts: tenant.hasSchoolContracts,
    hasDataImport: tenant.hasDataImport
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
