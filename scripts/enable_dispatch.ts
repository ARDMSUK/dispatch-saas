
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log("⚙️ Enabling Auto-Dispatch for Tenant...");

    // Update the first tenant found (or specific one if we knew ID, but context suggests single tenant active)
    const tenant = await prisma.tenant.findFirst();

    if (!tenant) {
        console.error("❌ No tenant found.");
        return;
    }

    await prisma.tenant.update({
        where: { id: tenant.id },
        data: { autoDispatch: true }
    });

    console.log(`✅ Auto-Dispatch ENABLED for tenant: ${tenant.name} (${tenant.id})`);

    // Also give Masood a location so he can be found by proximity logic if needed
    const masood = await prisma.driver.findFirst({
        where: { callsign: '12' } // Masood's callsign from debug output
    });

    if (masood) {
        // Set to Central London roughly
        const loc = JSON.stringify({ lat: 51.5074, lng: -0.1278 });
        await prisma.driver.update({
            where: { id: masood.id },
            data: { location: loc }
        });
        console.log("📍 Updated Masood's location to Central London for testing.");
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
