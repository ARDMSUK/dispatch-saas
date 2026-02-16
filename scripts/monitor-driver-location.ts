
import { prisma } from '@/lib/prisma';

async function main() {
    console.log("Monitoring driver location updates...");

    let lastLocation = "";

    // Poll every 2 seconds for 30 seconds
    const interval = setInterval(async () => {
        const driver = await prisma.driver.findFirst({
            where: { callsign: 'D-TEST' } // Assuming we log in as D-TEST later
        });

        if (driver && driver.location !== lastLocation) {
            console.log(`[${new Date().toISOString()}] Location Updated: ${driver.location}`);
            lastLocation = driver.location || "";
        }
    }, 2000);

    setTimeout(() => {
        clearInterval(interval);
        console.log("Monitoring finished.");
        process.exit(0);
    }, 30000);
}

main();
