const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAndCancel() {
    try {
        const job = await prisma.job.findUnique({ where: { id: 396 }});
        if (!job) {
            console.log('Job #396 not found');
            return;
        }
        console.log('--- PREVIOUS STATE ---');
        console.log('status:', job.status);
        console.log('paymentType:', job.paymentType);
        console.log('paymentStatus:', job.paymentStatus);
        console.log('notes:', job.notes);
        console.log('paymentLink:', job.paymentLink);
        
        await prisma.job.update({
            where: { id: 396 },
            data: {
                status: 'CANCELLED',
                notes: 'Manually cancelled broken legacy CARD web-booker test state'
            }
        });
        console.log('--- CANCELLED SUCCESSFULLY ---');
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}
checkAndCancel();
