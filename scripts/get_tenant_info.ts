import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const tenant = await prisma.tenant.findFirst();
    if (tenant) {
        console.log(`SLUG: ${tenant.slug}`);
        console.log(`API_KEY: ${tenant.apiKey}`);
    } else {
        console.log("No tenants found.");
    }
}

main()
    .then(async () => {
        await prisma.$disconnect();
    })
    .catch(async (e) => {
        console.error(e);
        await prisma.$disconnect();
        process.exit(1);
    });
