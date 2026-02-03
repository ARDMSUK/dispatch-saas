
import { prisma } from '../src/lib/prisma';

async function main() {
    const tenant = await prisma.tenant.findFirst();
    if (tenant) {
        console.log(`Tenant: ${tenant.name}`);
        console.log(`Location: ${tenant.lat}, ${tenant.lng}`);
    } else {
        console.log("No tenant found.");
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
