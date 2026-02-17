
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkLatestBooking() {
    const job = await prisma.job.findFirst({
        orderBy: { createdAt: 'desc' },
        include: {
            location: true,
            destination: true
        }
    });

    console.log('Latest Job:', JSON.stringify(job, null, 2));
}

checkLatestBooking()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
