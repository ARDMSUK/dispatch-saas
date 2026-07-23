import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function run() {
  const driver = await prisma.driver.findUnique({
    where: { id: 'cmotmmref0001gpsg8a1ju85m' }
  });
  console.log("Driver 38 status:", driver?.status);
  await prisma.$disconnect();
}
run();
