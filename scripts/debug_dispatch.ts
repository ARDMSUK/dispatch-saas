
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log("🔍 Debugging Dispatch State...");

    // 1. Get the most recent Job
    const job = await prisma.job.findFirst({
        orderBy: { bookedAt: 'desc' },
        include: { tenant: true }
    });

    if (!job) {
        console.log("❌ No jobs found!");
        return;
    }

    console.log(`\n📦 Latest Job ID: ${job.id}`);
    console.log(`   Status: ${job.status}`);
    console.log(`   Ordered At: ${job.bookedAt.toISOString()}`);
    console.log(`   Pickup Time: ${job.pickupTime.toISOString()}`);
    console.log(`   Tenant ID: ${job.tenantId}`);
    console.log(`   Tenant 'autoDispatch': ${job.tenant.autoDispatch}`);

    // 2. Check Drivers for this Tenant
    const drivers = await prisma.driver.findMany({
        where: { tenantId: job.tenantId }
    });

    console.log(`\n👤 Drivers for Tenant (${drivers.length}):`);
    drivers.forEach(d => {
        console.log(`   - ${d.name} (${d.callsign})`);
        console.log(`     Status: ${d.status}`);
        console.log(`     Location: ${d.location || 'NULL'}`);
    });

    // 3. Simulate Logic Check
    if (!job.tenant.autoDispatch) {
        console.log("\n⚠️ AUTO-DISPATCH IS DISABLED FOR THIS TENANT.");
    } else {
        console.log("\n✅ Auto-dispatch is ENABLED.");

        const availableDrivers = drivers.filter(d => d.status === 'FREE');
        if (availableDrivers.length === 0) {
            console.log("❌ No FREE drivers available.");
        } else {
            console.log(`✅ Found ${availableDrivers.length} FREE drivers. Checking locations...`);
            // Note: Real logic uses Haversine, but if location is missing it might fail
        }
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
