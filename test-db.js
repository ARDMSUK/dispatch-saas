const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log("=== TENANTS ===");
    const tenants = await prisma.tenant.findMany({
        where: { slug: { in: ['kentax', 'beaconsfield', 'tms'] } },
        include: {
            users: true,
            jobs: { select: { id: true,  status: true, pickupAddress: true, dropoffAddress: true, passengerName: true }, take: 10 },
            drivers: { select: { id: true, name: true } },
            vehicles: { select: { id: true, make: true, model: true } },
            customers: { select: { id: true, name: true, email: true } },
            pricingRules: { select: { id: true, name: true } }
        }
    });

    for (const t of tenants) {
        console.log(`\nTenant: ${t.name} (${t.slug})`);
        console.log(`- Config: useZonePricing=${t.useZonePricing}, autoDispatch=${t.autoDispatch}, dispatchAlgorithm=${t.dispatchAlgorithm}`);
        console.log(`- Integrations: Stripe=${!!t.stripePublishableKey}, Twilio=${!!t.twilioFromNumber}`);
        console.log(`- Users: ${t.users.length}, Drivers: ${t.drivers.length}, Vehicles: ${t.vehicles.length}`);
        console.log(`- Pricing Rules: ${t.pricingRules.length}`);
        console.log(`- Recent Jobs (Sample):`);
        t.jobs.forEach(j => console.log(`  * [${j.source}] ${j.status}: ${j.pickupAddress} -> ${j.dropoffAddress} (Pass: ${j.passengerName})`));
    }

    console.log("\n=== SAAS PLANS ===");
    const planNames = ['Family', 'SOLO', 'STANDARD', 'ADVANCED', 'CUSTOM', 'ar test', 'New Plan'];
    const plans = await prisma.saasPlan.findMany({
        where: { name: { in: planNames } },
        include: {
            tenants: { select: { id: true, name: true, slug: true } }
        }
    });

    for (const p of plans) {
        console.log(`\nPlan: ${p.name} (Price: ${p.priceMonthly}/${p.priceAnnual})`);
        console.log(`- Max Users: ${p.maxUsers}, Drivers: ${p.maxDrivers}`);
        console.log(`- Tenants using this plan: ${p.tenants.length} (${p.tenants.map(t => t.slug).join(', ')})`);
    }

    console.log("\n=== SYSTEM ADMINISTRATION ===");
    const sysAdminTenant = await prisma.tenant.findUnique({
        where: { slug: 'system-admin' }
    });
    if (sysAdminTenant) {
        const sysAdminJobs = await prisma.job.findMany({ where: { tenantId: sysAdminTenant.id }, take: 5, select: { pickupAddress: true, passengerName: true } });
        const sysAdminCustomers = await prisma.customer.count({ where: { tenantId: sysAdminTenant.id } });
        const sysAdminDrivers = await prisma.driver.count({ where: { tenantId: sysAdminTenant.id } });
        const sysAdminVehicles = await prisma.vehicle.count({ where: { tenantId: sysAdminTenant.id } });
        console.log(`System Admin Tenant ID: ${sysAdminTenant.id}`);
        console.log(`- Jobs: ${sysAdminJobs.length} (e.g. ${sysAdminJobs.map(j => j.passengerName).join(', ')})`);
        console.log(`- Customers: ${sysAdminCustomers}, Drivers: ${sysAdminDrivers}, Vehicles: ${sysAdminVehicles}`);
        
        const superAdmins = await prisma.user.findMany({ where: { role: 'SUPER_ADMIN' }, select: { email: true, name: true } });
        console.log(`- Super Admins: ${superAdmins.length} (${superAdmins.map(u => u.email).join(', ')})`);
    } else {
        console.log("System Admin tenant not found?!");
    }

    console.log("\n=== SUPPORT/TEST RECORDS ===");
    const tickets = await prisma.ticket.findMany({ take: 5, select: { title: true, status: true, description: true } });
    console.log(`Tickets (Sample):`);
    tickets.forEach(t => console.log(`- [${t.status}] ${t.title}: ${t.description.substring(0, 50)}...`));
}

main().catch(console.error).finally(() => prisma.$disconnect());
