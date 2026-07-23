import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const prisma = new PrismaClient();

async function run() {
    await prisma.tenant.update({
        where: { slug: 'bourneend' },
        data: { subscriptionStatus: 'ACTIVE' }
    });
    console.log("Tenant subscription status updated to ACTIVE");
}

run().catch(console.error).finally(() => prisma.$disconnect());
