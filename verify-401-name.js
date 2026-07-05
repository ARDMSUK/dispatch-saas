const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  try {
    const job = await prisma.job.findUnique({
      where: { id: 401 }
    });
    console.log(`Job 401 passengerName: "${job.passengerName}"`);
    console.log(`Job 401 paymentType: "${job.paymentType}"`);
    console.log(`Job 401 paymentStatus: "${job.paymentStatus}"`);
    
    // While I'm here, let's see why it was marked PAID
    // Wait, it is PAID? Let me print it again.
    console.log(`fare: ${job.fare}, amountPaid: ${job.amountPaid || 'undefined'}`);
  } catch (error) {
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}
run();
