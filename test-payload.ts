import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
    const tenants = await prisma.tenant.findMany({
        where: { whatsappInstanceStatus: 'CONNECTED' }
    });
    for (const t of tenants) {
        console.log("Found tenant:", t.name);
        console.log("PAYLOAD RECEIVED:", t.emailBodyReceipt);
    }
}

run().catch(e => console.error(e)).finally(() => prisma.$disconnect());
