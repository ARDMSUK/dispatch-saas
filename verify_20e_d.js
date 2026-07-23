const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verify() {
  try {
    const job = await prisma.job.findFirst({
      where: {
        passengerName: 'TEST PAYMENT SANDBOX 2'
      },
      orderBy: {
        bookedAt: 'desc'
      },
      include: {
        tenant: true
      }
    });

    console.log(JSON.stringify(job, null, 2));
    
    const count = await prisma.job.count({
      where: {
        passengerName: 'TEST PAYMENT SANDBOX 2'
      }
    });
    console.log(`Total jobs matching name: ${count}`);

  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

verify();
