const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const driver = await prisma.driver.findFirst({
        where: { pin: { not: null } },
        include: { tenant: true }
    });
    console.log(`SLUG: ${driver.tenant.slug}, CALLSIGN: ${driver.callsign}, PIN: ${driver.pin}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
