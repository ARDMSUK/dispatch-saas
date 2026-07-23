import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const prisma = new PrismaClient();

async function run() {
    console.log("Polling for final test job...");
    let job = null;
    let attempts = 0;
    while (attempts < 60) {
        const jobs = await prisma.job.findMany({
            where: { passengerName: { contains: "TEST 20F WEB CASH FINAL 2" } },
        });
        if (jobs.length > 0) {
            job = jobs[0];
            if (job.status === 'COMPLETED' || job.status === 'CANCELLED') {
                break;
            }
        }
        await new Promise(r => setTimeout(r, 5000));
        attempts++;
    }
    
    if (job) {
        console.log("Job found and finished!");
        console.log(JSON.stringify(job, null, 2));
    } else {
        console.log("Job not found or didn't complete within 5 minutes.");
    }
}

run().catch(console.error).finally(() => prisma.$disconnect());
