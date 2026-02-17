
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('--- Debugging Pricing Rules for demo-taxis ---');

    const tenant = await prisma.tenant.findUnique({ where: { slug: 'demo-taxis' } });
    if (!tenant) {
        console.log('Tenant demo-taxis not found');
        return;
    }
    console.log(`Tenant ID: ${tenant.id}`);

    const rules = await prisma.pricingRule.findMany({ where: { tenantId: tenant.id } });
    console.log(`Found ${rules.length} pricing rules:`);
    rules.forEach(r => console.log(r));

    const fixed = await prisma.fixedPrice.findMany({ where: { tenantId: tenant.id } });
    console.log(`Found ${fixed.length} fixed prices:`);
    fixed.forEach(f => console.log(f));
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
