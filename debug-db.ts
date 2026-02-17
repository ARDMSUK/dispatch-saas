
import { prisma } from './src/lib/prisma';

async function main() {
    console.log('--- Tenants ---');
    const tenants = await prisma.tenant.findMany();
    console.log(JSON.stringify(tenants, null, 2));

    console.log('\n--- Pricing Rules ---');
    const rules = await prisma.pricingRule.findMany();
    console.log(JSON.stringify(rules, null, 2));

    console.log('\n--- Fixed Prices ---');
    const fixed = await prisma.fixedPrice.findMany();
    console.log(JSON.stringify(fixed, null, 2));

    console.log('\n--- Drivers ---');
    const drivers = await prisma.driver.findMany();
    console.log(JSON.stringify(drivers, null, 2));
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
