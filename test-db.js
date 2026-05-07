const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const tenants = await prisma.tenant.findMany({
        select: { id: true, name: true, aviationStackApiKey: true }
    });
    console.log(tenants);
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
