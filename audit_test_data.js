const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function audit() {
    try {
        const testJobIds = [390, 391, 392, 393, 396, 397];
        const jobs = await prisma.job.findMany({
            where: { id: { in: testJobIds } },
            include: {
                customer: true,
                driver: true,
                account: true,
                invoice: true
            }
        });

        console.log('--- TEST JOBS ---');
        for (const job of jobs) {
            console.log(`\nJob #${job.id}`);
            console.log(`  Name/ref: ${job.passengerName} - ${job.pickupAddress} to ${job.dropoffAddress}`);
            console.log(`  Status: ${job.status}`);
            console.log(`  Payment type: ${job.paymentType}`);
            console.log(`  Payment status: ${job.paymentStatus}`);
            const paymentTaken = job.paymentStatus === 'PAID';
            console.log(`  Payment taken: ${paymentTaken}`);
            const hasStripe = !!job.paymentReferenceId || !!job.stripePaymentIntentId || !!job.paymentLink;
            console.log(`  Stripe record exists: ${hasStripe}`);
            console.log(`    Ref: ${job.paymentReferenceId}, Intent: ${job.stripePaymentIntentId}, Link: ${!!job.paymentLink}`);
            console.log(`  Linked to invoice: ${!!job.invoiceId}`);
            console.log(`  Linked to account: ${!!job.accountId}`);
            console.log(`  Linked to customer: ${job.customerId ? job.customer?.name || job.customerId : false}`);
            console.log(`  Linked to driver: ${job.driverId ? job.driver?.callsign || job.driverId : false}`);
            
            let recommended = 'cancel';
            if (job.id === 397) {
                recommended = 'keep';
            } else if (paymentTaken || hasStripe) {
                recommended = 'refund then cancel (or cancel if link only)';
            } else if (job.status === 'CANCELLED') {
                recommended = 'keep as cancelled (already cancelled)';
            }
            console.log(`  Recommended action: ${recommended}`);
        }

        const testCustomers = await prisma.customer.findMany({
            where: {
                OR: [
                    { name: { contains: 'test', mode: 'insensitive' } },
                    { email: { contains: 'test', mode: 'insensitive' } },
                    { name: { contains: 'bakhtiar', mode: 'insensitive' } },
                ]
            },
            include: { jobs: true }
        });

        console.log('\n--- TEST CUSTOMERS ---');
        for (const c of testCustomers) {
            console.log(`Customer: ${c.id} - ${c.name} (${c.email}) - Jobs count: ${c.jobs.length}`);
            const hasPaidJob = c.jobs.some(j => j.paymentStatus === 'PAID');
            const has397 = c.jobs.some(j => j.id === 397);
            let rec = 'delete';
            if (hasPaidJob || has397 || c.jobs.some(j => j.paymentReferenceId || j.stripePaymentIntentId)) {
                rec = 'keep (linked to Stripe/paid jobs)';
            }
            console.log(`  Recommended action: ${rec}`);
        }

        const testDrivers = await prisma.driver.findMany({
            where: {
                OR: [
                    { name: { contains: 'test', mode: 'insensitive' } },
                    { callsign: { contains: 'test', mode: 'insensitive' } }
                ]
            },
            include: { jobs: true }
        });

        console.log('\n--- TEST DRIVERS ---');
        for (const d of testDrivers) {
            console.log(`Driver: ${d.id} - ${d.callsign} - ${d.name} - Jobs count: ${d.jobs.length}`);
            let rec = 'delete';
            if (d.jobs.length > 0) {
                rec = 'disable/archive';
            }
            console.log(`  Recommended action: ${rec}`);
        }

        const testAccounts = await prisma.account.findMany({
            where: {
                OR: [
                    { name: { contains: 'test', mode: 'insensitive' } }
                ]
            },
            include: { jobs: true, invoices: true }
        });
        
        console.log('\n--- TEST ACCOUNTS ---');
        for (const a of testAccounts) {
            console.log(`Account: ${a.id} - ${a.name} - Jobs: ${a.jobs.length}, Invoices: ${a.invoices.length}`);
            let rec = 'delete';
            if (a.jobs.length > 0 || a.invoices.length > 0) {
                rec = 'keep (linked)';
            }
            console.log(`  Recommended action: ${rec}`);
        }

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}
audit();
