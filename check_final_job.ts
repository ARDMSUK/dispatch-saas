import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const prisma = new PrismaClient();

async function run() {
    const jobs = await prisma.job.findMany({
        where: { passengerName: { contains: "TEST 20F WEB CASH FINAL 2" } },
    });
    console.log("Jobs found:", jobs.length);
    if (jobs.length > 0) {
        console.log("Job ID:", jobs[0].id);
        console.log("Status:", jobs[0].status);
        console.log("PaymentStatus:", jobs[0].paymentStatus);
    }
}

run().catch(console.error).finally(() => prisma.$disconnect());
