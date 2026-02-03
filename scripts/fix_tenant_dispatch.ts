
import { PrismaClient } from '@prisma/client';
import { DispatchEngine } from '../src/lib/dispatch-engine';

const prisma = new PrismaClient();

const TARGET_TENANT_ID = 'cmkz09rr10000emphfzmxqkdo'; // The one from your debug logs

async function main() {
    console.log(`🔧 Fixing Configuration for Tenant: ${TARGET_TENANT_ID}`);

    // 1. Enable Auto-Dispatch
    await prisma.tenant.update({
        where: { id: TARGET_TENANT_ID },
        data: { autoDispatch: true }
    });
    console.log("✅ Auto-Dispatch set to TRUE.");

    // 2. Ensure Masood has location
    const driver = await prisma.driver.findFirst({
        where: {
            tenantId: TARGET_TENANT_ID,
            callsign: '12' // Masood
        }
    });

    if (driver) {
        if (!driver.location) {
            const loc = JSON.stringify({ lat: 51.5074, lng: -0.1278 });
            await prisma.driver.update({
                where: { id: driver.id },
                data: { location: loc }
            });
            console.log("📍 Masood location updated.");
        } else {
            console.log("📍 Masood already has location.");
        }
    }

    // 3. Force Run Dispatcher Now
    console.log("\n🚀 Triggering Dispatch Engine...");
    const report = await DispatchEngine.runDispatchLoop(TARGET_TENANT_ID);

    console.log("\n📊 Dispatch Report:");
    console.log(`   Pending Jobs Found: ${report.totalPending}`);
    console.log(`   Assigned: ${report.assigned}`);
    console.log(`   Failed: ${report.failed}`);
    console.log(`   Details:`, report.details);
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
