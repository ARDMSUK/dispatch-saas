const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function dryRun() {
    try {
        console.log('--- STARTING DRY RUN ---');

        // 1. JOBS
        const jobs = await prisma.job.findMany({
            where: { id: { in: [390, 391, 392] } }
        });

        console.log('\n--- JOBS ---');
        for (const job of jobs) {
            console.log(`\nJob #${job.id}:`);
            console.log(`  status: ${job.status}`);
            console.log(`  paymentStatus: ${job.paymentStatus}`);
            console.log(`  paymentType: ${job.paymentType}`);
            console.log(`  paymentReferenceId: ${job.paymentReferenceId}`);
            console.log(`  stripePaymentIntentId: ${job.stripePaymentIntentId}`);
            console.log(`  paymentLink: ${job.paymentLink}`);
            console.log(`  invoiceId: ${job.invoiceId}`);
            
            const isSafe = job.paymentStatus === 'UNPAID' && 
                           !job.paymentReferenceId && 
                           !job.stripePaymentIntentId && 
                           !job.paymentLink && 
                           !job.invoiceId;
            
            console.log(`  Safe to update: ${isSafe ? 'YES' : 'NO'}`);
        }

        // 2. DRIVERS
        console.log('\n--- DRIVERS ---');
        const driver88 = await prisma.driver.findUnique({
            where: { id: 'cmq08ce6700018eu3ccq0lsb0' },
            include: {
                _count: {
                    select: { jobs: true, DriverMessage: true }
                }
            }
        });

        if (driver88) {
            console.log(`\nDriver 88 (${driver88.callsign} - ${driver88.name}):`);
            console.log(`  Jobs count: ${driver88._count.jobs}`);
            console.log(`  Messages count: ${driver88._count.DriverMessage}`);
            
            const isSafeDelete = driver88._count.jobs === 0 && driver88._count.DriverMessage === 0;
            console.log(`  Safe to hard delete: ${isSafeDelete ? 'YES' : 'NO (fallback to archive)'}`);
        }

        const driverS01 = await prisma.driver.findUnique({
            where: { id: 'cmm8ab4di0001igdkwpmdqbx5' },
            include: {
                _count: {
                    select: { jobs: true, DriverMessage: true }
                }
            }
        });

        if (driverS01) {
            console.log(`\nDriver S01 (${driverS01.callsign} - ${driverS01.name}):`);
            console.log(`  Jobs count: ${driverS01._count.jobs}`);
            console.log(`  Safe to archive: YES (Will set OFF_DUTY and prefix name)`);
        }

        // 3. ACCOUNTS
        console.log('\n--- ACCOUNTS ---');
        const account = await prisma.account.findUnique({
            where: { id: 'cmpya19qx0003fo3c1y5hyzdy' },
            include: {
                _count: {
                    select: { jobs: true, invoices: true }
                }
            }
        });

        if (account) {
            console.log(`\nAccount Test Corporate Client Ltd (${account.name}):`);
            console.log(`  Jobs count: ${account._count.jobs}`);
            console.log(`  Invoices count: ${account._count.invoices}`);
            
            // We can't be 100% sure about all foreign keys via just _count without listing all possible relations,
            // but jobs and invoices are the primary ones. If 0, mostly safe. To be absolutely safe, we will fallback to archive.
            const isSafeDelete = account._count.jobs === 0 && account._count.invoices === 0;
            console.log(`  Safe to hard delete: ${isSafeDelete ? 'YES (but will fallback to archive just in case)' : 'NO (fallback to archive)'}`);
        }

        console.log('\n--- DRY RUN COMPLETE ---');
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}
dryRun();
