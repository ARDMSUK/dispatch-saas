import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    // 1. Find the busy driver 'AR' (ID 38 according to UI)
    const driver = await prisma.driver.findFirst({
        where: { name: "AR" } // We'll search by name to be safe
    });

    if (!driver) {
        console.log("Could not find driver");
        return;
    }

    console.log(`Testing with Driver: ${driver.name} (ID: ${driver.id}), Status: ${driver.status}`);

    // Let's manually trigger the Prisma update just like the /api/driver/jobs/[id]/status route
    const updateData: any = { status: 'FREE' };
    updateData.location = JSON.stringify({ lat: 51.5, lng: -0.1 }); // Simulate location passing too

    console.log("Saving to database...");
    await prisma.driver.update({
        where: { id: driver.id },
        data: updateData
    });

    const verify = await prisma.driver.findUnique({ where: { id: driver.id }});
    console.log(`New DB Status: ${verify?.status}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
