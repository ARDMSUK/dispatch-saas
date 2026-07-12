const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const driver = await prisma.driver.findFirst({
        where: { name: { contains: 'AR' } }
    });
    console.log(JSON.stringify(driver, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
