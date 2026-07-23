import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const prisma = new PrismaClient();

async function run() {
    const job = await prisma.job.findUnique({
        where: { id: 415 },
    });
    console.log(job);
}

run().catch(console.error).finally(() => prisma.$disconnect());
