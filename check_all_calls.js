const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    const calls = await prisma.incomingCall.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5
    });
    console.log("Recent calls globally:");
    console.log(calls);
}
main().finally(() => prisma.$disconnect());
