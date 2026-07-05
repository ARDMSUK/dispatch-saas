const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const job = await prisma.job.findUnique({
    where: { id: 401 },
    include: {
      driver: true,
    }
  });

  const drivers = await prisma.driver.findMany({
    where: { callsign: "38" }
  });

  console.log(JSON.stringify({ job, driverByCallsign: drivers }, null, 2));
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
