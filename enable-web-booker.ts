const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const tms = await prisma.tenant.update({
        where: { slug: 'tms' },
        data: { enableWebBooker: true }
    });
    console.log(`Enabled Web Booking for tenant: ${tms.name}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
