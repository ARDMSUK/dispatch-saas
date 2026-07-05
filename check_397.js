const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check397() {
    try {
        const job = await prisma.job.findUnique({ where: { id: 397 }});
        if (!job) {
            console.log('Job #397 not found');
            return;
        }
        console.log(JSON.stringify(job, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}
check397();
