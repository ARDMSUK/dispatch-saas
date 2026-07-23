import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const prisma = new PrismaClient();

async function run() {
    console.log("Checking tables...");
    const models = Object.keys(prisma);
    console.log(models);
}

run().catch(console.error).finally(() => prisma.$disconnect());
