const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log("Starting full production cleanup...");

    const sysAdmin = await prisma.tenant.findUnique({
        where: { slug: 'system-admin' }
    });
    if (!sysAdmin) {
        console.error("System admin tenant not found!");
        process.exit(1);
    }

    const digitalDmUser = await prisma.user.findUnique({
        where: { email: 'digitaldmagency@gmail.com' }
    });
    if (!digitalDmUser) {
        console.error("digitaldmagency@gmail.com user not found!");
        process.exit(1);
    }

    // 1. Delete all operational data across all tenants (including system-admin)
    console.log("Deleting operational data...");
    
    const modelsToClear = [
        'auditLog', 'incidentReport', 'ticketMessage', 'ticket', 'invoice',
        'zoneQueue', 'incomingCall', 'document', 'driverMessage', 'passengerAssistant',
        'routeStop', 'contractRoute', 'contract', 'account', 'student', 'meetAndGreet',
        'job', 'flightCache', 'customer', 'driver', 'vehicle', 'tenantFaq',
        'pricingRule', 'zone', 'fixedPrice', 'surcharge', 'whatsappSession', 'aiKnowledgeRule'
    ];

    for (const model of modelsToClear) {
        if (prisma[model]) {
            console.log(`Deleting ${model}...`);
            await prisma[model].deleteMany({});
        } else {
            console.warn(`Model ${model} not found in Prisma Client.`);
        }
    }

    // 2. Delete users except digitaldmagency@gmail.com
    console.log("Deleting users...");
    await prisma.user.deleteMany({
        where: { id: { not: digitalDmUser.id } }
    });

    // 3. Delete tenants except system-admin
    console.log("Deleting tenants...");
    await prisma.tenant.deleteMany({
        where: { id: { not: sysAdmin.id } }
    });

    // 4. Delete SaaS plans except the 4 preserved
    console.log("Deleting non-standard SaaS plans...");
    if (prisma.saasPlan) {
        await prisma.saasPlan.deleteMany({
            where: { name: { notIn: ['SOLO', 'STANDARD', 'ADVANCED', 'CUSTOM'] } }
        });
    } else if (prisma.plan) {
        await prisma.plan.deleteMany({
            where: { name: { notIn: ['SOLO', 'STANDARD', 'ADVANCED', 'CUSTOM'] } }
        });
    }

    console.log("Cleanup complete!");
    
    // Verify remaining data
    const remTenants = await prisma.tenant.count();
    const remUsers = await prisma.user.count();
    console.log(`Remaining Tenants: ${remTenants} (Expected 1)`);
    console.log(`Remaining Users: ${remUsers} (Expected 1)`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
