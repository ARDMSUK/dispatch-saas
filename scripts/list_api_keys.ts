const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function showAllApiKeys() {
    console.log("Listing all Tenants and their API Keys...");
    try {
        const tenants = await prisma.tenant.findMany({
            select: { id: true, name: true, slug: true, apiKey: true }
        });

        console.log(JSON.stringify(tenants, null, 2));
    } catch (e) {
        console.error("Error:", e);
    } finally {
        await prisma.$disconnect();
    }
}

showAllApiKeys();
