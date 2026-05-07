const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    const tenant = await prisma.tenant.findUnique({ where: { slug: 'bourneend' } });
    if (tenant) {
        const calls = await prisma.incomingCall.findMany({
            where: { tenantId: tenant.id },
            orderBy: { createdAt: 'desc' },
            take: 5
        });
        console.log("Recent calls for bourneend:");
        console.log(calls);
    } else {
        console.log("Tenant not found");
    }
}
main().finally(() => prisma.$disconnect());
