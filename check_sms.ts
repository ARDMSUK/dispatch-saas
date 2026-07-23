import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const prisma = new PrismaClient();

async function run() {
    if ('smsLog' in prisma) {
        const sms = await (prisma as any).smsLog.findMany({ where: { jobId: 416 } });
        console.log("SMS Logs:", sms.length);
    } else {
        console.log("No smsLog model found.");
    }
}

run().catch(console.error).finally(() => prisma.$disconnect());
