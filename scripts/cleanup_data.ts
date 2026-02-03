
import { prisma } from '../src/lib/prisma';

async function main() {
    console.log("Starting cleanup...");

    const tenant = await prisma.tenant.findFirst();
    if (!tenant) {
        console.log("No tenant found. Nothing to clean.");
        return;
    }

    console.log(`Cleaning data for tenant: ${tenant.name} (${tenant.id})`);

    // 1. Delete Jobs (Bookings)
    const deletedJobs = await prisma.job.deleteMany({
        where: { tenantId: tenant.id }
    });
    console.log(`Deleted ${deletedJobs.count} Bookings.`);

    // 2. Delete Vehicles
    // Vehicles might be linked to drivers, but if we delete vehicles first, it should be fine?
    // Actually, if we delete drivers, we might need to unlink vehicles first.
    // Let's delete Vehicles first.
    const deletedVehicles = await prisma.vehicle.deleteMany({
        where: { tenantId: tenant.id }
    });
    console.log(`Deleted ${deletedVehicles.count} Vehicles.`);

    // 3. Delete Drivers
    // Drivers might be referenced by Jobs (which are deleted) or Vehicles (which are deleted).
    // Pre-assigned jobs might be an issue if not caught by deleteMany Jobs?
    // Relations:
    // Job -> Driver (driverId) - Deleted above.
    // Vehicle -> Driver (driverId) - Deleted above.
    const deletedDrivers = await prisma.driver.deleteMany({
        where: { tenantId: tenant.id }
    });
    console.log(`Deleted ${deletedDrivers.count} Drivers.`);

    // Optional: Delete Customers created during testing?
    // User didn't explicitly ask, but usually test bookings make test customers.
    // I'll stick to the request: Bookings, Drivers, Vehicles.

    console.log("Cleanup complete.");
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
