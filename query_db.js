require('dotenv').config({ path: '.env.prod.final.BACKUP_DO_NOT_USE' });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const drivers = await prisma.driver.findMany({
    where: {
      tenantId: 'cmotadopt00081184tr3olkzc'
    },
    select: {
      id: true,
      name: true,
      callsign: true,
      status: true,
      currentLat: true,
      currentLng: true,
      lastLocationUpdate: true
    }
  });
  console.log(JSON.stringify(drivers, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
