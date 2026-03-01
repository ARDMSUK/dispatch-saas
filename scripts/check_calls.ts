const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkCalls() {
    console.log("Checking recent Incoming Calls...");
    try {
        const calls = await prisma.incomingCall.findMany({
            orderBy: { createdAt: 'desc' },
            take: 5,
            include: { tenant: { select: { slug: true } } }
        });

        if (calls.length === 0) {
            console.log("No incoming calls found in the database.");
        } else {
            console.log(JSON.stringify(calls, null, 2));
        }
    } catch (e) {
        console.error("Error querying database:", e);
    } finally {
        await prisma.$disconnect();
    }
}

checkCalls();
