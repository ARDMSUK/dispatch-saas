import { prisma } from '../src/lib/prisma';

async function main() {
    const job = await prisma.job.findFirst({
        orderBy: { bookedAt: 'desc' },
        include: { customer: true }
    });

    if (job) {
        console.log(`Latest Job: ${job.id}`);
        console.log(`Status: ${job.status}`);
        console.log(`Customer: ${job.customer.name}`);
        console.log(`Pickup: ${job.pickup}`);
    } else {
        console.log("No jobs found.");
    }
}

main();
