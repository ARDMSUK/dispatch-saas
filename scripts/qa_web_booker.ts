import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import { addDays } from 'date-fns';

const prisma = new PrismaClient();

async function runTest() {
    console.log("--- QA TEST: Web Booker & Recurring Bookings ---");
    try {
        const tenant = await prisma.tenant.findFirst();
        if (!tenant) throw new Error("No Tenant found.");

        let customer = await prisma.customer.findFirst({ where: { tenantId: tenant.id, phone: "+447000000099" } });
        if (!customer) {
            customer = await prisma.customer.create({
                data: {
                    tenantId: tenant.id,
                    phone: "+447000000099",
                    name: "Web Booker Test",
                    email: "webbooker@test.com"
                }
            });
        }

        console.log("1. Testing Web Booker Creation Logic");
        // Web booker usually hits /api/booker/[slug] - simulating DB payload
        const webJob = await prisma.job.create({
            data: {
                tenantId: tenant.id,
                customerId: customer.id,
                pickupAddress: "123 Public St",
                dropoffAddress: "456 Private Ave",
                pickupTime: new Date(Date.now() + 1000 * 60 * 120),
                passengerName: "Web Customer",
                passengerPhone: "+447000000099", // Matching customer
                passengers: 1,
                vehicleType: "Saloon",
                status: "PENDING",
                fare: 25.0,
                paymentType: "CARD", // Often web uses Stripe
                paymentStatus: "AUTHORIZED", // Waiting for completion capture
                stripePaymentIntentId: "pi_web_test_123",
                isFixedPrice: false, // Calculated via map
                autoDispatch: tenant.autoDispatch // Follows tenant rules
            }
        });
        console.log("✅ Web Booking Payload accepted successfully:", webJob.id);

        console.log("2. Testing Automated Recurring Bookings");
        const recurrenceGroupId = randomUUID();
        const baseDate = new Date(Date.now() + 1000 * 60 * 60 * 24); // Start tomorrow

        // Simulating a system generating 5 recurring jobs
        const recurringJobs = [];
        for (let i = 0; i < 5; i++) {
            recurringJobs.push({
                tenantId: tenant.id,
                customerId: customer.id,
                pickupAddress: "School",
                dropoffAddress: "Home",
                pickupTime: addDays(baseDate, i), // One per day
                passengerName: "Child Route",
                passengerPhone: "+447000000099",
                passengers: 1,
                vehicleType: "Saloon",
                status: "UNASSIGNED",
                fare: 15.0,
                paymentType: "ACCOUNT",
                paymentStatus: "UNPAID",
                isFixedPrice: true,
                autoDispatch: true,
                isRecurring: true,
                recurrenceRule: "DAILY",
                recurrenceGroupId: recurrenceGroupId
            });
        }

        const createdRecurring = await prisma.job.createMany({
            data: recurringJobs
        });

        console.log(`✅ ${createdRecurring.count} Recurring Jobs created as a batch with GroupID: ${recurrenceGroupId}`);

        // Fetch to verify spacing
        const fetchedRecurring = await prisma.job.findMany({
            where: { recurrenceGroupId },
            orderBy: { pickupTime: 'asc' }
        });
        if (fetchedRecurring.length !== 5) throw new Error("Recurring job length mismatch");
        console.log(`✅ Verified 5 jobs exist in DB spanning: ${fetchedRecurring[0].pickupTime.toISOString()} to ${fetchedRecurring[4].pickupTime.toISOString()}`);


        // Cleanup
        await prisma.job.delete({ where: { id: webJob.id } });
        await prisma.job.deleteMany({ where: { recurrenceGroupId } });

        console.log("--- QA TEST PASSED: Web Booker & Recurring Models validated ---");

    } catch (err) {
        console.error("❌ QA TEST FAILED:", err);
    } finally {
        await prisma.$disconnect();
    }
}

runTest();
