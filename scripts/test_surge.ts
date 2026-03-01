import { calculatePrice } from '../src/lib/pricing';
import { prisma } from '../src/lib/prisma';

async function main() {
    // 1. Get or create a Tenant
    let tenant = await prisma.tenant.findFirst({
        where: { name: 'Test Surge Tenant' }
    });

    if (!tenant) {
        tenant = await prisma.tenant.create({
            data: {
                name: 'Test Surge Tenant',
                slug: 'test-surge-' + Date.now(),
                enableDynamicPricing: true,
                enableWaitCalculations: true
            }
        });
    } else {
        await prisma.tenant.update({
            where: { id: tenant.id },
            data: { enableDynamicPricing: true, enableWaitCalculations: true }
        });
    }

    // 2. Clear old surcharges for test isolation
    await prisma.surcharge.deleteMany({
        where: { tenantId: tenant.id }
    });

    // 3. Create a Pricing Rule (Base 5, 2/mile, 0.50/min wait)
    let rule = await prisma.pricingRule.findFirst({ where: { tenantId: tenant.id, vehicleType: 'Saloon' } });
    if (!rule) {
        rule = await prisma.pricingRule.create({
            data: {
                tenantId: tenant.id,
                name: 'Standard',
                vehicleType: 'Saloon',
                baseRate: 5.00,
                perMile: 2.00,
                minFare: 10.00,
                waitingFreq: 0.50
            }
        });
    } else {
        await prisma.pricingRule.update({
            where: { id: rule.id },
            data: { baseRate: 5.00, perMile: 2.00, waitingFreq: 0.50 }
        })
    }

    // 4. Create a 50% Surge for 'Friday Night' (All day Friday for testing: day 5)
    await prisma.surcharge.create({
        data: {
            tenantId: tenant.id,
            name: 'Friday Surge',
            type: 'PERCENT',
            value: 50,
            daysOfWeek: '5' // Friday
        }
    });

    // 5. Create a Flat £10 Toll for 'Congestion' (All times)
    await prisma.surcharge.create({
        data: {
            tenantId: tenant.id,
            name: 'Congestion Toll',
            type: 'FLAT',
            value: 10.00
        }
    });

    // TEST 1: Wednesday (No percent surge, but generic flat toll applies), No wait time
    // Distance 10 miles. Base 5 + (10*2) = £25
    // Toll = £10. Total expected: £35
    console.log("--- TEST 1: Wednesday, 10 Miles, No Wait ---");
    const wednesday = new Date('2026-03-04T12:00:00Z'); // A Wednesday
    const res1 = await calculatePrice({
        pickup: 'A', dropoff: 'B', distanceMiles: 10,
        pickupTime: wednesday, companyId: tenant.id
    });
    console.log("Result 1:", JSON.stringify(res1.breakdown, null, 2));
    console.log(`Expected Price: 35 | Actual: ${res1.price}\n`);

    // TEST 2: Friday (50% surge + flat toll), 10 mins wait time
    // Distance 10 miles. Base = £25. Wait (10 * 0.5) = £5. Total Sub = £30
    // Surge 50% = £15. Toll = £10. Total expected: 30 + 15 + 10 = £55
    console.log("--- TEST 2: Friday, 10 Miles, 10 mins Wait ---");
    const friday = new Date('2026-03-06T20:00:00Z'); // A Friday
    const res2 = await calculatePrice({
        pickup: 'A', dropoff: 'B', distanceMiles: 10,
        pickupTime: friday, companyId: tenant.id,
        waitingTime: 10 // 10 minutes wait
    });
    console.log("Result 2:", JSON.stringify(res2.breakdown, null, 2));
    console.log(`Expected Price: 55 | Actual: ${res2.price}\n`);

}

main().catch(console.error).finally(() => prisma.$disconnect());
