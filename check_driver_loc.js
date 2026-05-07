const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const driver = await prisma.driver.findFirst({
    where: { callsign: '38' }
  });
  console.log(driver);
}

check().finally(() => prisma.$disconnect());
