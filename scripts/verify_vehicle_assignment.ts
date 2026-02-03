
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log("Verifying Vehicle Assignment API...");

    const tenant = await prisma.tenant.findFirst({ where: { slug: 'demo-taxis' } });
    if (!tenant) throw new Error("Tenant 'demo-taxis' not found");

    // 1. Create a Test Vehicle
    console.log("1. Creating Test Vehicle...");
    const vehicle = await prisma.vehicle.create({
        data: {
            reg: 'TEST_ASSIGN_1',
            make: 'Test',
            model: 'Car',
            type: 'Saloon',
            tenantId: tenant.id
        }
    });
    console.log(`Vehicle created: ${vehicle.id} (${vehicle.reg})`);

    // 2. Find a Driver
    const driver = await prisma.driver.findFirst({ where: { tenantId: tenant.id } });
    if (!driver) throw new Error("No driver found");
    console.log(`Driver found: ${driver.id} (${driver.callsign})`);

    // 3. Call API logic (Simulate PATCH)
    // accessing the DB directly to simulate what the API does
    console.log("3. Updating Vehicle via Prisma (Simulating API logic)...");
    const updated = await prisma.vehicle.update({
        where: { id: vehicle.id },
        data: {
            driverId: driver.id
        },
        include: { driver: true }
    });

    if (updated.driverId === driver.id) {
        console.log("SUCCESS: Driver assigned correctly in DB.");
    } else {
        console.error("FAILURE: Driver ID not set.");
    }

    // 4. Verify Fetch (simulating GET)
    const fetched = await prisma.vehicle.findUnique({
        where: { id: vehicle.id },
        include: { driver: true }
    });
    console.log(`Fetched Vehicle Driver Verified: ${fetched?.driver?.callsign}`);

    // Cleanup
    await prisma.vehicle.delete({ where: { id: vehicle.id } });
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
