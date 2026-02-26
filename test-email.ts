import { EmailService } from './src/lib/email-service';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const job = await prisma.job.findFirst({
        orderBy: { updatedAt: 'desc' },
        include: { customer: true }
    });

    if (!job) {
        console.log("No job found");
        return;
    }

    console.log(`Testing with Job #${job.id}, Customer Email: ${job.customer?.email}`);

    try {
        const result = await EmailService.sendBookingConfirmation(job);
        console.log("Result:", result);
    } catch (e) {
        console.error("Error sending email:", e);
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
