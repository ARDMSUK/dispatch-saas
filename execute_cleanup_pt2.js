const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function executePt2() {
    let retries = 5;
    while(retries > 0) {
        try {
            console.log('--- STARTING EXECUTION PT2 ---');
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
            break;
        } catch (e) {
            console.error(`ERROR DURING EXECUTION. Retries left: ${retries - 1}`, e.message);
            retries--;
            await new Promise(r => setTimeout(r, 5000));
        }
    }
    await prisma.$disconnect();
}
executePt2();
