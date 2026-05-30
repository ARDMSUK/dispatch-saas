import { PrismaClient } from '@prisma/client';
import { DispatchEngine } from '../src/lib/dispatch-engine';
import { calculateDistance } from '../src/lib/geoutils';

const prisma = new PrismaClient();

async function main() {
    console.log("--- STARTING TEST: MAPBOX INTELLIGENT ETA DISPATCH ---");

    // 1. Resolve/create a test tenant
    const tenant = await prisma.tenant.findFirst();
    if (!tenant) {
        throw new Error("No tenant found. Run setup first.");
    }
    console.log(`Using Tenant: ${tenant.name} (${tenant.id})`);

    // Store original settings
    const originalAutoDispatch = tenant.autoDispatch;
    const originalAlgo = tenant.dispatchAlgorithm;

    // Set settings for test
    await prisma.tenant.update({
        where: { id: tenant.id },
        data: {
            autoDispatch: true,
            dispatchAlgorithm: 'CLOSEST'
        }
    });

    const testPhoneA = "07700111111";
    const testPhoneB = "07700222222";

    // Clean up any stale test entities
    await prisma.driver.deleteMany({
        where: { phone: { in: [testPhoneA, testPhoneB] } }
    });
    await prisma.job.deleteMany({
        where: { passengerPhone: "07700900000" }
    });

    // 2. Create test drivers
    console.log("\n[1] Seeding test drivers with coordinates...");
    const driverA = await prisma.driver.create({
        data: {
            tenantId: tenant.id,
            name: "Driver A (Close Straight, Slow Road)",
            phone: testPhoneA,
            email: "driver.a@example.com",
            callsign: "DRV-A",
            status: "FREE",
            location: JSON.stringify({ lat: 51.4800, lng: -0.4600 }) // Straight distance ~1.1km
        }
    });

    const driverB = await prisma.driver.create({
        data: {
            tenantId: tenant.id,
            name: "Driver B (Far Straight, Fast Road)",
            phone: testPhoneB,
            email: "driver.b@example.com",
            callsign: "DRV-B",
            status: "FREE",
            location: JSON.stringify({ lat: 51.4500, lng: -0.4200 }) // Straight distance ~3.2km
        }
    });

    // 3. Create a test job near Heathrow
    const job = await prisma.job.create({
        data: {
            tenantId: tenant.id,
            passengerName: "ETA Test Passenger",
            passengerPhone: "07700900000",
            pickupAddress: "Heathrow Airport Terminal 2",
            dropoffAddress: "10 Downing Street, London",
            pickupLat: 51.4700,
            pickupLng: -0.4543,
            pickupTime: new Date(Date.now() + 10 * 60 * 1000), // 10 mins from now (within auto-dispatch lookahead)
            status: "PENDING",
            autoDispatch: true
        }
    });
    console.log(`Seeded Job ID: ${job.id}`);

    try {
        // --- CASE 1: Test with MAPBOX_ACCESS_TOKEN and Mocked API Response ---
        console.log("\n[CASE 1] Simulating Mapbox Matrix API with Mocked Response...");
        
        // Mock global.fetch to intercept Mapbox Matrix API calls
        const originalFetch = global.fetch;
        process.env.MAPBOX_ACCESS_TOKEN = "mock-mapbox-token-12345";

        global.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
            const urlString = input.toString();
            if (urlString.includes("api.mapbox.com/directions/matrix")) {
                console.log(`   [FETCH MOCK] Intercepted Mapbox Matrix Request: ${urlString.slice(0, 120)}...`);
                // Driver A is index 0 in targets: straight line closer, but slow road (900s / 15m duration)
                // Driver B is index 1 in targets: straight line further, but fast road (300s / 5m duration)
                return {
                    ok: true,
                    json: async () => ({
                        durations: [
                            [900], // Driver A (slow road duration: 15 mins)
                            [300]  // Driver B (fast road duration: 5 mins)
                        ],
                        distances: [
                            [2500], // Driver A
                            [4000]  // Driver B
                        ]
                    }),
                    text: async () => ""
                } as Response;
            }
            return originalFetch(input, init);
        }) as any;

        // Run dispatch loop
        console.log("Running Dispatch Loop (Mapbox Active)...");
        const report = await DispatchEngine.runDispatchLoop(tenant.id);
        console.log("Dispatch Loop Result:", report);

        // Check if Driver B was assigned (since ETA is 5 mins vs 15 mins, even though Driver A is closer geometrically)
        let updatedJob = await prisma.job.findUnique({ where: { id: job.id } });
        if (!updatedJob || updatedJob.driverId !== driverB.id) {
            throw new Error(`[CASE 1 FAILED] Expected job to be assigned to Driver B (${driverB.name}). Got driverId: ${updatedJob?.driverId}`);
        }
        console.log("✅ CASE 1 PASSED: Intelligent ETA dispatch assigned job to Driver B based on road duration!");

        // Restore driver states to FREE and job state to PENDING for Case 2
        await prisma.driver.updateMany({
            where: { id: { in: [driverA.id, driverB.id] } },
            data: { status: 'FREE' }
        });
        await prisma.job.update({
            where: { id: job.id },
            data: { status: 'PENDING', driverId: null }
        });

        // --- CASE 2: Test Fallback (No Mapbox Token / API Error) ---
        console.log("\n[CASE 2] Simulating Mapbox Fallback (Token Missing)...");
        delete process.env.MAPBOX_ACCESS_TOKEN;

        console.log("Running Dispatch Loop (Mapbox Fallback)...");
        const reportFallback = await DispatchEngine.runDispatchLoop(tenant.id);
        console.log("Dispatch Loop Fallback Result:", reportFallback);

        // Check if Driver A was assigned (fallback uses Haversine straight-line distance, where Driver A is closer)
        updatedJob = await prisma.job.findUnique({ where: { id: job.id } });
        if (!updatedJob || updatedJob.driverId !== driverA.id) {
            throw new Error(`[CASE 2 FAILED] Expected job to fallback to Driver A (${driverA.name}) based on straight-line distance. Got driverId: ${updatedJob?.driverId}`);
        }
        console.log("✅ CASE 2 PASSED: Fallback logic correctly selected Driver A based on straight-line distance!");

        // Restore global fetch
        global.fetch = originalFetch;

    } finally {
        // Cleanup
        console.log("\n[Cleanup] Removing test entities and restoring settings...");
        try {
            await prisma.driver.deleteMany({
                where: { id: { in: [driverA.id, driverB.id] } }
            });
        } catch (e) {
            console.error("Cleanup driver failed", e);
        }
        try {
            await prisma.job.delete({
                where: { id: job.id }
            });
        } catch (e) {
            console.error("Cleanup job failed", e);
        }
        await prisma.tenant.update({
            where: { id: tenant.id },
            data: {
                autoDispatch: originalAutoDispatch,
                dispatchAlgorithm: originalAlgo
            }
        });
        console.log("✅ Cleanup complete!");
    }

    console.log("\n--- TEST COMPLETED SUCCESSFULLY ---");
}

main().catch(err => {
    console.error("❌ Test Failed:", err);
    process.exit(1);
}).finally(async () => {
    await prisma.$disconnect();
});
