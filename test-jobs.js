const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const jobs = await prisma.job.findMany({
        where: { tenantId: 'cmotadopt00081184tr3olkzc', flightNumber: { not: null, notIn: ['', ' '] } }
    });
    console.log(jobs.map(j => ({ id: j.id, flight: j.flightNumber, status: j.status })));
}

main().finally(() => prisma.$disconnect());
