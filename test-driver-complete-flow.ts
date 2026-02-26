import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    // 1. Get a busy driver
    const driver = await prisma.driver.findFirst({
        where: { id: "38" } // Using the ID from the screenshot
    });

    if (!driver) {
        console.log("Driver not found.");
        return;
    }

    console.log(`Setting driver ${driver.callsign} from ${driver.status} to FREE...`);

    const updated = await prisma.driver.update({
        where: { id: driver.id },
        data: { status: 'FREE' }
    });

    console.log(`Driver status is now: ${updated?.status}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
