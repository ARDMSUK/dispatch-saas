
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const driverId = process.argv[2];
    const lat = parseFloat(process.argv[3]);
    const lng = parseFloat(process.argv[4]);

    if (!driverId || isNaN(lat) || isNaN(lng)) {
        console.error("Usage: tsx update-driver-location.ts <driverId> <lat> <lng>");
        process.exit(1);
    }

    console.log(`Updating driver ${driverId} location to ${lat}, ${lng}...`);

    const driver = await prisma.driver.update({
        where: { id: driverId },
        data: {
            location: JSON.stringify({ lat, lng })
        }
    });

    console.log("Updated driver location:", driver.location);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
