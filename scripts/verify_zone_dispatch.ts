
import { prisma } from '../src/lib/prisma';
import { DispatchEngine } from '../src/lib/dispatch-engine';

async function main() {
    console.log("Starting Zone Dispatch Verification...");

    // 1. Setup Tenant
    const tenant = await prisma.tenant.findFirst();
    if (!tenant) throw new Error("No tenant found");

    // Ensure Auto-Dispatch is ON
    await prisma.tenant.update({
        where: { id: tenant.id },
        data: { autoDispatch: true }
    });

    // 2. Create Zone (Central London Box roughly)
    // TopLeft: 51.52, -0.15
    // BottomRight: 51.49, -0.05
    const zonePoly = [
        [51.52, -0.15],
        [51.52, -0.05],
        [51.49, -0.05],
        [51.49, -0.15]
    ];

    const zone = await prisma.zone.create({
        data: {
            tenantId: tenant.id,
            name: "Test Zone Central",
            color: "#ff0000",
            coordinates: JSON.stringify(zonePoly)
        }
    });
    console.log("Created Zone:", zone.name);

    // 3. Create Drivers
    // Driver A: IN ZONE (51.50, -0.10) - center-ish
    const driverIn = await prisma.driver.create({
        data: {
            tenantId: tenant.id,
            name: "Driver In Zone",
            callsign: "Z-IN",
            phone: "07000000001",
            status: "FREE",
            location: JSON.stringify({ lat: 51.50, lng: -0.10 })
        }
    });

    // Driver B: OUT OF ZONE but NEAR (51.48, -0.10) - Just south of zone (51.49 boundary)
    // Distance check:
    // Job at 51.50, -0.10.
    // Driver In: 0 distance (at pickup).
    // Driver Out: ~1.4 miles away.
    // WAIT: To prove priority, let's make Driver In FARTHER than Driver Out.

    // UPDATE POSITIONS:
    // JOB: 51.51, -0.10 (North inside zone)

    // Driver In: 51.495, -0.10 (South inside zone) -> Dist ~ 1.0 mile
    await prisma.driver.update({
        where: { id: driverIn.id },
        data: { location: JSON.stringify({ lat: 51.495, lng: -0.10 }) }
    });

    // Driver Out: 51.511, -0.10 (Just North outside zone 51.52? No wait, 51.52 is top boundary).
    // Let's go West.
    // Zone Left is -0.15.
    // Job at 51.50, -0.14 (Inside, near left edge)

    // Driver In: 51.50, -0.06 (Inside, right side). Dist ~ 0.08 deg longitude (~3 miles)
    // Driver Out: 51.50, -0.151 (Just outside left edge). Dist ~ 0.011 deg longitude (~0.5 miles)

    // So Driver Out is CLOSER, but Driver In is IN ZONE.
    // Expected: Driver In gets job.

    const jobPickup = { lat: 51.50, lng: -0.14 };

    await prisma.driver.update({
        where: { id: driverIn.id },
        data: { location: JSON.stringify({ lat: 51.50, lng: -0.06 }) } // Far inside
    });

    const driverOut = await prisma.driver.create({
        data: {
            tenantId: tenant.id,
            name: "Driver Out Zone",
            callsign: "Z-OUT",
            phone: "07000000002",
            status: "FREE",
            location: JSON.stringify({ lat: 51.50, lng: -0.151 }) // Close outside
        }
    });

    // 4. Create Job
    const job = await prisma.job.create({
        data: {
            tenantId: tenant.id,
            pickupAddress: "In Zone Pickup",
            dropoffAddress: "Anywhere",
            pickupLat: jobPickup.lat,
            pickupLng: jobPickup.lng,
            pickupTime: new Date(),
            passengerName: "Zone Test",
            passengerPhone: "555",
            status: "PENDING"
        }
    });

    console.log(`Created Job ${job.id} at ${jobPickup.lat}, ${jobPickup.lng}`);

    // 5. Run Dispatch
    console.log("Running Dispatch...");
    const report = await DispatchEngine.runDispatchLoop(tenant.id);
    console.log("Report:", report);

    // 6. Verify Assignment
    const updatedJob = await prisma.job.findUnique({ where: { id: job.id }, include: { driver: true } });

    if (updatedJob?.driverId === driverIn.id) {
        console.log("SUCCESS: Driver IN zone was assigned, despite being further away.");
    } else if (updatedJob?.driverId === driverOut.id) {
        console.error("FAILURE: Driver OUT of zone was assigned (closest won).");
    } else {
        console.error("FAILURE: No driver assigned.");
    }

    // Cleanup
    await prisma.job.delete({ where: { id: job.id } });
    await prisma.driver.delete({ where: { id: driverIn.id } });
    await prisma.driver.delete({ where: { id: driverOut.id } });
    await prisma.zone.delete({ where: { id: zone.id } });
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
