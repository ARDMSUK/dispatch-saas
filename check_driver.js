const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    const driver = await prisma.driver.findFirst({
        where: { callsign: '38' }
    });
    console.log("Driver:", driver.name, "Callsign:", driver.callsign);
    console.log("Location:", driver.location);
}
main().finally(() => prisma.$disconnect());
