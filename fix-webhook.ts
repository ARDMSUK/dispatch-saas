import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
    await prisma.tenant.updateMany({
        where: { name: 'Beaconsfield Taxi Services' }, // Or any condition
        data: { hasWhatsAppAi: true }
    });
    console.log("Enabled hasWhatsAppAi for Beaconsfield Taxis!");
}

run()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
