
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Clearing test data...');

    // 1. Delete Jobs (Transactions)
    const deletedJobs = await prisma.job.deleteMany({});
    console.log(`Deleted ${deletedJobs.count} jobs.`);

    // 2. Delete Customers (Optional, but clean slate)
    const deletedCustomers = await prisma.customer.deleteMany({});
    console.log(`Deleted ${deletedCustomers.count} customers.`);

    // Note: We keep Drivers, Vehicles, Users, PricingRules, Zones, Settings
    // so the system remains usable without re-setup.

    console.log('Test data cleared successfully.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
