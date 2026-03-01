const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function clearCalls() {
    console.log("Clearing old ringing calls...");
    try {
        await prisma.incomingCall.updateMany({
            where: { status: 'RINGING' },
            data: { status: 'DISMISSED' }
        });
        console.log("Cleared.");
    } catch (e) {
        console.error("Error:", e);
    } finally {
        await prisma.$disconnect();
    }
}

clearCalls();
