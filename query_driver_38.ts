import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const driver = await prisma.driver.findFirst({
    where: {
      callsign: '38'
    },
    include: {
      vehicles: true,
      documents: true
    }
  });

  console.log(JSON.stringify(driver, null, 2));
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
