import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const slug = 'bourneend';
    const callsign = '6';

    const tenant = await prisma.tenant.findUnique({ where: { slug } });
    if (!tenant) {
        console.error(`Tenant with slug ${slug} not found`);
        return;
    }
    console.log(`Found tenant: ${tenant.name} (${tenant.id})`);

    const driver = await prisma.driver.findUnique({
        where: { tenantId_callsign: { tenantId: tenant.id, callsign } }
    });

    if (!driver) {
        console.error(`Driver with callsign ${callsign} not found`);
        return;
    }

    console.log(`Driver Info:`);
    console.log(`- ID: ${driver.id}`);
    console.log(`- Name: ${driver.name}`);
    console.log(`- Status: ${driver.status}`);
    console.log(`- Callsign: ${driver.callsign}`);
    console.log(`- PIN: ${driver.pin}`);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
