const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    // 1. Tenants
    const tenants = await prisma.tenant.findMany({
        include: {
            _count: {
                select: { users: true, drivers: true, vehicles: true, customers: true, jobs: true }
            }
        }
    });

    console.log("=== TENANTS ===");
    tenants.forEach(t => {
        console.log(`Tenant ID: ${t.id} | Name: ${t.name} | Slug: ${t.slug}`);
        console.log(`Counts -> Users: ${t._count.users}, Drivers: ${t._count.drivers}, Vehicles: ${t._count.vehicles}, Customers: ${t._count.customers}, Jobs: ${t._count.jobs}`);
    });

    // 3. Super Admins
    const superAdmins = await prisma.user.findMany({
        where: { role: 'SUPER_ADMIN' },
        select: { id: true, email: true, name: true, role: true }
    });
    console.log("\n=== SUPER ADMINS ===");
    console.table(superAdmins);

    // 4. SaaS Plans
    const plans = await prisma.saasPlan.findMany();
    console.log("\n=== SAAS PLANS ===");
    console.log(`Found ${plans.length} plans:`, plans.map(p => p.name).join(', '));

    // 5. Total counts across DB
    const totalJobs = await prisma.job.count();
    const totalCustomers = await prisma.customer.count();
    const totalDrivers = await prisma.driver.count();
    const totalVehicles = await prisma.vehicle.count();
    const totalContracts = await prisma.contract.count();
    const totalInvoices = await prisma.invoice.count();
    const totalSupportTickets = await prisma.ticket.count();
    
    console.log("\n=== PLATFORM TOTALS (SYNTHETIC CANDIDATES) ===");
    console.log({
        totalJobs,
        totalCustomers,
        totalDrivers,
        totalVehicles,
        totalContracts,
        totalInvoices,
        totalSupportTickets
    });
}

main().catch(console.error).finally(() => prisma.$disconnect());
