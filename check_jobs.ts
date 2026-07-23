import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const prisma = new PrismaClient();

async function run() {
    const jobs = await prisma.job.findMany({
        where: { id: { gt: 415 } },
    });
    console.log("New jobs:", jobs.length);
}

run().catch(console.error).finally(() => prisma.$disconnect());
