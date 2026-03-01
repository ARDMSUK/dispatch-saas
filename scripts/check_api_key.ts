const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkApiKey() {
    console.log("Checking API Key...");
    try {
        const tenant = await prisma.tenant.findUnique({
            where: { apiKey: 'cmm0pvscq0002mcxw24t2l' },
            select: { id: true, slug: true, name: true }
        });

        console.log("Tenant found:", tenant);
    } catch (e) {
        console.error("Error:", e);
    } finally {
        await prisma.$disconnect();
    }
}

checkApiKey();
