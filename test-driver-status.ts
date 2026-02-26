import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    // 1. Get a busy driver
    const driver = await prisma.driver.findFirst({
        where: { status: 'BUSY' }
    });

    if (!driver) {
        console.log("No busy driver found to test with.");
        return;
    }

    console.log(`Setting driver ${driver.callsign} to FREE via simulated location+status race...`);

    // Simulate what the API route does now:
    const driverUpdateData: any = {};
    driverUpdateData.status = 'FREE';
    driverUpdateData.location = JSON.stringify({ lat: 51.5, lng: -0.1 });

    await prisma.driver.update({
        where: { id: driver.id },
        data: driverUpdateData
    });

    const updated = await prisma.driver.findUnique({ where: { id: driver.id }});
    console.log(`Driver status is now: ${updated?.status}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
