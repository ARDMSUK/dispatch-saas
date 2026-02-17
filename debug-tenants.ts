
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('--- Debugging Tenants & Drivers ---');

    // 1. List Tenants
    const tenants = await prisma.tenant.findMany();
    console.log(`Found ${tenants.length} tenants:`);
    tenants.forEach(t => console.log(` - ID: ${t.id}, Slug: ${t.slug}, Name: ${t.name}`));

    // 2. List Drivers for each tenant
    for (const t of tenants) {
        const drivers = await prisma.driver.findMany({ where: { tenantId: t.id } });
        console.log(` Tenant [${t.slug}] has ${drivers.length} drivers:`);
        drivers.forEach(d => console.log(`   > ID: ${d.id}, Callsign: ${d.callsign}, PIN: ${d.pin}, Name: ${d.name}`));
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
