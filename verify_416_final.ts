import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const prisma = new PrismaClient();

async function run() {
    const jobs = await prisma.job.findMany({
        where: { passengerName: { contains: "TEST 20F WEB CASH FINAL 2" } }
    });
    console.log("Duplicate jobs found (should be 1):", jobs.length);
}

run().catch(console.error).finally(() => prisma.$disconnect());
