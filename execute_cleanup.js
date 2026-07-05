const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function execute() {
    try {
        console.log('--- STARTING EXECUTION ---');

        // 1. JOBS
        console.log('\n--- JOBS ---');
        const targetJobs = [390, 391, 392];
        for (const id of targetJobs) {
            const job = await prisma.job.findUnique({ where: { id } });
            console.log(`\nJob #${id} CURRENT STATE:`, JSON.stringify(job, null, 2));

            const isSafe = job.paymentStatus === 'UNPAID' && 
                           !job.paymentReferenceId && 
                           !job.stripePaymentIntentId && 
                           !job.paymentLink && 
                           !job.invoiceId;

            if (isSafe) {
                console.log(`Decision: SAFE TO UPDATE (Conditions Met)`);
                const updated = await prisma.job.update({
                    where: { id },
                    data: {
                        status: 'CANCELLED',
                        notes: job.notes ? job.notes + ' [NO_NOTIFICATIONS] Test cleanup' : '[NO_NOTIFICATIONS] Test cleanup'
                    }
                });
                console.log(`Job #${id} FINAL STATE:`, JSON.stringify(updated, null, 2));
                console.log(`Status: SUCCESS`);
            } else {
                console.log(`Decision: UNSAFE TO UPDATE (Skipping)`);
            }
        }

        // CONFIRM UNTOUCHED
        const unchangedJobs = await prisma.job.findMany({ where: { id: { in: [393, 396, 397] } } });
        for (const j of unchangedJobs) {
            console.log(`\nJob #${j.id} CONFIRMATION: Status=${j.status}, PaymentStatus=${j.paymentStatus}, Notes=${j.notes}`);
        }

        // 2. DRIVER 88
        console.log('\n--- DRIVERS ---');
        const driver88Id = 'cmq08ce6700018eu3ccq0lsb0';
        const driver88 = await prisma.driver.findUnique({
            where: { id: driver88Id },
            include: { _count: { select: { jobs: true, DriverMessage: true } } }
        });
        
        if (driver88) {
            console.log(`\nDriver 88 CURRENT STATE:`, JSON.stringify(driver88, null, 2));
            const isSafeDelete = driver88._count.jobs === 0 && driver88._count.DriverMessage === 0;

            if (isSafeDelete) {
                console.log(`Decision: SAFE TO DELETE`);
                await prisma.driver.delete({ where: { id: driver88Id } });
                console.log(`Driver 88 FINAL STATE: DELETED`);
                console.log(`Status: SUCCESS`);
            } else {
                console.log(`Decision: UNSAFE TO DELETE (Fallback to Archive)`);
                const updated = await prisma.driver.update({
                    where: { id: driver88Id },
                    data: {
                        status: 'OFF_DUTY',
                        name: driver88.name.includes('[ARCHIVED]') ? driver88.name : `[ARCHIVED] ${driver88.name}`
                    }
                });
                console.log(`Driver 88 FINAL STATE: ARCHIVED`, JSON.stringify(updated, null, 2));
                console.log(`Status: SUCCESS`);
            }
        } else {
            console.log(`Driver 88: Not found (already deleted?)`);
        }

        // 3. DRIVER S01
        const driverS01Id = 'cmm8ab4di0001igdkwpmdqbx5';
        const driverS01 = await prisma.driver.findUnique({
            where: { id: driverS01Id },
            include: { _count: { select: { jobs: true, DriverMessage: true } } }
        });
        
        if (driverS01) {
            console.log(`\nDriver S01 CURRENT STATE:`, JSON.stringify(driverS01, null, 2));
            console.log(`Decision: ARCHIVE ONLY`);
            const updated = await prisma.driver.update({
                where: { id: driverS01Id },
                data: {
                    status: 'OFF_DUTY',
                    name: driverS01.name.includes('[ARCHIVED]') ? driverS01.name : `[ARCHIVED] ${driverS01.name}`
                }
            });
            console.log(`Driver S01 FINAL STATE:`, JSON.stringify(updated, null, 2));
            console.log(`Status: SUCCESS`);
        }

        // 4. ACCOUNT
        console.log('\n--- ACCOUNTS ---');
        const accountId = 'cmpya19qx0003fo3c1y5hyzdy';
        const account = await prisma.account.findUnique({
            where: { id: accountId },
            include: { _count: { select: { jobs: true, invoices: true } } }
        });

        if (account) {
            console.log(`\nAccount CURRENT STATE:`, JSON.stringify(account, null, 2));
            console.log(`Decision: ARCHIVE ONLY`);
            const updated = await prisma.account.update({
                where: { id: accountId },
                data: {
                    name: account.name.includes('[ARCHIVED]') ? account.name : `[ARCHIVED] ${account.name}`
                }
            });
            console.log(`Account FINAL STATE:`, JSON.stringify(updated, null, 2));
            console.log(`Status: SUCCESS`);
        }

        console.log('\n--- EXECUTION COMPLETE ---');
    } catch (e) {
        console.error('ERROR DURING EXECUTION:', e);
    } finally {
        await prisma.$disconnect();
    }
}
execute();
