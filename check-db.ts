import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const drivers = await prisma.driver.findMany({ include: { vehicles: true }});
    console.log("DRIVERS:", JSON.stringify(drivers, null, 2));

    const tenants = await prisma.tenant.findMany({ select: { id: true, name: true, smsTemplateDriverAssigned: true, smsTemplateDriverArrived: true }});
    console.log("TENANTS:", JSON.stringify(tenants, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
