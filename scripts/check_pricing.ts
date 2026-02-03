import { prisma } from '../src/lib/prisma';

async function main() {
    console.log("Checking Pricing Rules...");
    const rules = await prisma.pricingRule.findMany({
        include: { tenant: true }
    });
    console.log(`Found ${rules.length} rules.`);
    rules.forEach(r => {
        console.log(`- Type: ${r.vehicleType}, Base: ${r.baseRate}, PerMile: ${r.perMile}, Tenant: ${r.tenant.slug}`);
    });

    console.log("\nChecking Fixed Prices...");
    const fixed = await prisma.fixedPrice.findMany();
    console.log(`Found ${fixed.length} fixed prices.`);
    fixed.forEach(f => {
        console.log(`- ${f.pickup} -> ${f.dropoff}: £${f.price}`);
    });
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
