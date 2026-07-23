import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const prisma = new PrismaClient();

async function run() {
    console.log("=== JOB 415 VERIFICATION ===");
    const job = await prisma.job.findUnique({
        where: { id: 415 },
        include: {
            tenant: true,
            driver: true
        }
    });

    if (!job) {
        console.log("Job 415 NOT FOUND!");
        return;
    }

    console.log("Job ID:", job.id);
    console.log("Tenant:", job.tenant.name, `(${job.tenantId})`);
    console.log("Passenger Name:", job.passengerName);
    console.log("Passenger Phone:", job.passengerPhone);
    console.log("Passenger Email:", job.passengerEmail);
    console.log("Payment Type:", job.paymentType);
    console.log("Payment Status:", job.paymentStatus);
    console.log("Job Status:", job.status);
    console.log("autoDispatch:", job.autoDispatch);
    console.log("driverId:", job.driverId);
    console.log("Driver Name:", job.driver?.name);
    console.log("Driver Callsign:", job.driver?.callsign);
    console.log("Driver Status:", job.driver?.status);
    console.log("Payment Link:", job.paymentLink);
    console.log("stripeCheckoutSessionId:", job.stripeCheckoutSessionId);
    console.log("stripePaymentIntentId:", job.stripePaymentIntentId);
    console.log("stripeChargeId:", job.stripeChargeId);
    console.log("Notes:", job.notes);
    
    // Check for audit logs if any (assuming a table exists, if not we'll handle it)
}

run().catch(console.error).finally(() => prisma.$disconnect());
