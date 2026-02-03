
import { prisma } from '../src/lib/prisma';

async function main() {
    const drivers = await prisma.driver.findMany();
    console.log(`Found ${drivers.length} drivers:`);
    drivers.forEach(d => {
        console.log(`- ${d.name} (${d.callsign}): ${d.status} | Location: ${d.location}`);
    });
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
