import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const job = await prisma.job.findUnique({
        where: { id: 332 }
    });
    console.log("Job 332 Database State:");
    console.log(JSON.stringify(job, null, 2));
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
