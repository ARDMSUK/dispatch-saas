
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('--- Checking Min Fares ---');
    const tenant = await prisma.tenant.findUnique({ where: { slug: 'demo-taxis' } });

    if (!tenant) { console.log("Tenant not found"); return; }

    const rules = await prisma.pricingRule.findMany({ where: { tenantId: tenant.id } });

    rules.forEach(r => {
        console.log(`[${r.vehicleType}] Base: £${r.baseRate}, PerMile: £${r.perMile}, MIN FARE: £${r.minFare}`);
    });
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
