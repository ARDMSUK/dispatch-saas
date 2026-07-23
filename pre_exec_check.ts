import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
  const driver = await prisma.driver.findUnique({
    where: { id: 'cmotmmref0001gpsg8a1ju85m' },
    include: { tenant: true }
  });
  console.log("Driver tenantId:", driver?.tenantId);
  console.log("Driver status:", driver?.status);
  console.log("Tenant autoDispatch:", driver?.tenant?.autoDispatch);

  await prisma.$disconnect();
}
run();
