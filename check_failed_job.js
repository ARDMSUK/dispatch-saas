const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const jobs = await prisma.job.findMany({
    where: {
      tenantId: 'cmotadopt00081184tr3olkzc'
    },
    select: {
      id: true,
      updatedAt: true,
      tenantId: true,
      status: true,
      paymentType: true,
      paymentStatus: true,
      paymentProvider: true,
      paymentReferenceId: true,
      stripePaymentIntentId: true,
      fare: true,
      passengerName: true,
      passengerEmail: true,
      passengerPhone: true
    },
    orderBy: { id: 'desc' },
    take: 5
  });
  console.log(JSON.stringify(jobs, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
