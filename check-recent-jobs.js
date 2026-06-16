const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log("Fetching recent jobs...");
    const jobs = await prisma.job.findMany({
        take: 10,
        orderBy: { id: 'desc' },
        include: {
            driver: true,
            account: true
        }
    });
    
    console.log("RECENT JOBS:");
    jobs.forEach(job => {
        console.log(`- ID: ${job.id}, Status: ${job.status}, Phone: ${job.passengerPhone}, Passenger: ${job.passengerName}, Account: ${job.account?.name || 'None'} (${job.account?.code || 'None'}), Driver: ${job.driver?.callsign || 'None'}, isBilled: ${job.isBilled}`);
    });
}

main().catch(console.error).finally(() => prisma.$disconnect());
