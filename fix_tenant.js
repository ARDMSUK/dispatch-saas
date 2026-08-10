const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixTenant() {
    try {
        const res = await prisma.tenant.update({
            where: { slug: 'passenger-e2e' },
            data: { enableWebBooker: true }
        });
        console.log("Tenant updated successfully:");
        console.log("enableWebBooker:", res.enableWebBooker);
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

fixTenant();
