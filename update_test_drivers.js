const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const tenant = await prisma.tenant.findFirst({
        where: { name: { contains: 'London Exec Test', mode: 'insensitive' } }
    });

    if (!tenant) {
        console.error('London Exec Test tenant not found');
        return;
    }

    const driverIds = [
        '994980',
        '996443',
        '992117',
        '990739',
        '6' // abdul
    ];

    const result = await prisma.driver.updateMany({
        where: {
            tenantId: tenant.id,
            callsign: { in: driverIds }
        },
        data: {
            status: 'OFF_DUTY'
        }
    });

    console.log(`Updated ${result.count} drivers to OFF_DUTY.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
