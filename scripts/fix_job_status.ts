
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log("Fixing Job Statuses...");
    const result = await prisma.job.updateMany({
        where: { status: 'ASSIGNED' },
        data: { status: 'DISPATCHED' }
    });
    console.log(`Updated ${result.count} jobs from ASSIGNED to DISPATCHED.`);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
