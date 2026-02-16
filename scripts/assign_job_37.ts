import { prisma } from '../src/lib/prisma';

async function main() {
    const jobId = 37;
    const driver = await prisma.user.findFirst({ where: { role: 'DRIVER' } });
    if (!driver) throw new Error("No driver found");

    // Also need a vehicle
    const vehicle = await prisma.vehicle.findFirst({ where: { driverId: driver.id } }) || await prisma.vehicle.findFirst();

    // Need to find the driver entry in 'Driver' model, not just User. 
    // Wait, the schema has a Driver model. The User model might not be linked directly to Driver in the same way?
    // Let's check schema again. User has no relation to Driver. Driver has relation to Tenant.
    // We need a record from the `Driver` model.

    const driverRecord = await prisma.driver.findFirst();

    if (!driverRecord) {
        console.error("No driver record found in Driver model.");
        return;
    }

    console.log(`Assigning Job ${jobId} to Driver ${driverRecord.name} (${driverRecord.callsign})...`);

    // Update Job
    await prisma.job.update({
        where: { id: jobId },
        data: {
            status: 'ASSIGNED',
            driverId: driverRecord.id,
            // vehicleId is not on Job based on schema? 
            // Let's check schema. Job has driverId. Driver has vehicles.
            // Job does NOT have vehicleId. It keeps vehicleType string.
            // But the UI shows vehicle details. The API fetches driver.vehicle.
            // So we need to ensure the driver has a vehicle assigned.
        }
    });

    // Ensure driver has a location for the map
    await prisma.driver.update({
        where: { id: driverRecord.id },
        data: {
            location: JSON.stringify({ lat: 51.5074, lng: -0.1278 }) // London
        }
    });

    console.log("Job assigned and driver location updated.");
}

main();
