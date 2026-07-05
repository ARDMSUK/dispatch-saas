const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  try {
    const job = await prisma.job.findUnique({
      where: { id: 400 },
      include: { ActivityLog: true } // Let's try ActivityLog just in case it works now, wait we checked and it didn't exist earlier. Let's omit it.
    });
    
    // I'll skip ActivityLog since it failed earlier.
  } catch (e) {}
}
run();
