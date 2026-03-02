import { PrismaClient } from '@prisma/client';
import { calculatePrice } from '../src/lib/pricing'; // Assuming we can use the core function directly

const prisma = new PrismaClient();

async function runTest() {
    console.log("--- QA TEST: Dynamic Pricing & Fleet Matrix ---");
    try {
        let tenant = await prisma.tenant.findFirst();
        if (!tenant) throw new Error("No Tenant found.");

        // Force enable dynamic pricing for this test
        tenant = await prisma.tenant.update({
            where: { id: tenant.id },
            data: { enableDynamicPricing: true }
        });

        console.log("1. Seeding Fixed Price override");
        const fixed = await prisma.fixedPrice.create({
            data: {
                tenantId: tenant.id,
                name: "QA Heathrow Run",
                pickup: "10 Downing Street, London",
                dropoff: "Heathrow Airport T5",
                price: 65.0,
                vehicleType: "Executive",
                isReverse: true
            }
        });

        console.log("2. Seeding Pricing Rules (Saloon vs Exec)");
        const ruleSaloon = await prisma.pricingRule.upsert({
            where: { tenantId_vehicleType: { tenantId: tenant.id, vehicleType: "Saloon" } },
            update: { minFare: 5.0, baseRate: 3.5, perMile: 2.0 },
            create: { tenantId: tenant.id, vehicleType: "Saloon", name: "Standard", minFare: 5.0, baseRate: 3.5, perMile: 2.0 }
        });

        const ruleExec = await prisma.pricingRule.upsert({
            where: { tenantId_vehicleType: { tenantId: tenant.id, vehicleType: "Executive" } },
            update: { minFare: 15.0, baseRate: 7.0, perMile: 3.5 },
            create: { tenantId: tenant.id, vehicleType: "Executive", name: "VIP", minFare: 15.0, baseRate: 7.0, perMile: 3.5 }
        });

        console.log("3. Seeding Complex Surcharges (Night Rate + Christmas)");
        // Clear existing to avoid test pollution
        await prisma.surcharge.deleteMany({ where: { tenantId: tenant.id } });

        // 50% Night Rate
        const nightSurcharge = await prisma.surcharge.create({
            data: {
                tenantId: tenant.id,
                name: "Night Rate",
                type: "PERCENT",
                value: 50,
                startTime: "22:00",
                endTime: "06:00"
            }
        });

        // £10 Flat Holiday Rate 
        const nextXmas = new Date(new Date().getFullYear(), 11, 25);
        const holidaySurcharge = await prisma.surcharge.create({
            data: {
                tenantId: tenant.id,
                name: "Christmas Flat Rate",
                type: "FLAT",
                value: 10.0,
                startDate: new Date(nextXmas.setHours(0, 0, 0, 0)),
                endDate: new Date(nextXmas.setHours(23, 59, 59, 999))
            }
        });

        console.log("4. Executing Pricing Engine Vectors");

        // Distance is mocking a direct call, so let's execute the logic
        // We'll mock 5 miles.
        const distanceMiles = 5;

        // Vector A: Saloon Day Time Minimum Fare Constraint
        // Base 3.5 + (0.1 miles * 2) = 3.7. Should snap to Minimum Fare (5.0)
        let resA = await calculatePrice({ companyId: tenant.id, distanceMiles: 0.1, pickupTime: new Date("2025-06-15T12:00:00Z"), vehicleType: "Saloon", pickup: "Close", dropoff: "Closer" });
        if (resA.price < 5.0) throw new Error("Saloon Min Fare Constraint Failed");
        console.log(`✅ Vector A passed: Short journey snapped to minimum fare (£${resA.price.toFixed(2)})`);

        // Vector B: Executive Fixed Price Override
        // Even if distance is 100 miles, if strings match '10 Downing' and 'Heathrow', it should equal 65.0
        let resB = await calculatePrice({ companyId: tenant.id, distanceMiles: 100, pickupTime: new Date("2025-06-15T12:00:00Z"), vehicleType: "Executive", pickup: "10 Downing Street, London", dropoff: "Heathrow Airport T5" });
        if (resB.price !== 65.0) throw new Error(`Fixed price override failed. Expected 65.0, got ${resB.price}`);
        if (!resB.breakdown.isFixed) throw new Error("Did not flag as fixed price");
        console.log(`✅ Vector B passed: Fixed Price successfully intercepted distance algorithm (£${resB.price.toFixed(2)})`);

        // Vector C: Saloon Night Rate Surge Math
        // Base: 3.5 + (5 * 2) = 13.5
        // Surcharge: 50% of 13.5 = 6.75
        // Expected = 20.25
        let resC = await calculatePrice({ companyId: tenant.id, distanceMiles: 5, pickupTime: new Date("2025-06-15T23:30:00Z"), vehicleType: "Saloon", pickup: "Normal A", dropoff: "Normal B" });
        if (resC.price !== 20.25) throw new Error(`Night rate multiplier failed. Expected 20.25, got ${resC.price}`);
        console.log(`✅ Vector C passed: Night 50% surge correctly amplified base algorithm (£${resC.price.toFixed(2)})`);

        // Vector D: Executive Overlapping Surcharges (Christmas Night)
        // Night Rate + Flat Holiday
        // Base Exec (5 miles): 7.0 + (5 * 3.5) = 24.5
        // Multiplier: 50% = 12.25
        // Subtotal = 36.75. Flat Add = 10.0 => Expected = 46.75
        let resD = await calculatePrice({ companyId: tenant.id, distanceMiles: 5, pickupTime: new Date(new Date().getFullYear(), 11, 25, 23, 0, 0), vehicleType: "Executive", pickup: "Normal A", dropoff: "Normal B" });
        if (resD.price !== 46.75) throw new Error(`Surcharge overlap failed. Expected 46.75, got ${resD.price}`);
        console.log(`✅ Vector D passed: Overlapping Percentage & Flat Surcharges stacked securely on VIP tier (£${resD.price.toFixed(2)})`);


        // Cleanup Test Artifacts
        await prisma.fixedPrice.delete({ where: { id: fixed.id } });
        await prisma.surcharge.delete({ where: { id: nightSurcharge.id } });
        await prisma.surcharge.delete({ where: { id: holidaySurcharge.id } });

        console.log("--- QA TEST PASSED: Pricing Engine Vectors completely secure ---");

    } catch (err) {
        console.error("❌ QA TEST FAILED:", err);
    } finally {
        await prisma.$disconnect();
    }
}

runTest();
