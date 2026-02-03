
import { prisma } from '../src/lib/prisma';

async function main() {
    const tenant = await prisma.tenant.findFirst();
    if (!tenant || !tenant.lat || !tenant.lng) throw new Error("Tenant location not found");

    const driver = await prisma.driver.findFirst({ where: { callsign: 'D-TEST' } });
    if (!driver) throw new Error("Test driver not found");

    console.log(`Moving driver ${driver.name} from ${driver.location} to Tenant (${tenant.lat}, ${tenant.lng})`);

    await prisma.driver.update({
        where: { id: driver.id },
        data: {
            location: JSON.stringify({ lat: tenant.lat, lng: tenant.lng })
        }
    });
    console.log("Moved.");
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
