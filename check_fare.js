const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const job = await prisma.job.findUnique({
        where: { id: 406 }
    });
    console.log("Fare:", job.fare);
}

main().catch(console.error).finally(() => prisma.$disconnect());
