import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
  const drivers = await prisma.driver.findMany({ 
    where: { tenant: { slug: 'bourneend' } } 
  });
  console.log(JSON.stringify(drivers, null, 2));
  await prisma.$disconnect();
}
run();
