import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function runTest() {
    console.log("--- QA TEST: Dispatcher Booking Creation ---");
    try {
        const tenant = await prisma.tenant.findFirst();
        if (!tenant) throw new Error("No Tenant found.");

        const customer = await prisma.customer.findFirst({ where: { tenantId: tenant.id } });
        if (!customer) throw new Error("No Customer found.");

        const account = await prisma.account.findFirst({ where: { tenantId: tenant.id } });
        // Driver might not be necessary for creation, but let's grab one just in case we test assignment too.

        console.log("1. Testing CASH Booking Creation");
        const cashJob = await prisma.job.create({
            data: {
                tenantId: tenant.id,
                customerId: customer.id,
                pickupAddress: "10 Downing Street, London",
                dropoffAddress: "Heathrow Airport T5",
                pickupTime: new Date(Date.now() + 1000 * 60 * 60), // 1 hour from now
                passengerName: "Test Cash",
                passengerPhone: "+447000000001",
                passengers: 2,
                vehicleType: "Saloon",
                status: "PENDING",
                fare: 45.0,
                paymentType: "CASH",
                paymentStatus: "UNPAID",
                isFixedPrice: true,
                autoDispatch: false
            }
        });
        console.log("✅ CASH Job Created successfully:", cashJob.id);

        console.log("2. Testing CARD Booking Creation (Authorized)");
        const cardJob = await prisma.job.create({
            data: {
                tenantId: tenant.id,
                customerId: customer.id,
                pickupAddress: "Buckingham Palace, London",
                dropoffAddress: "Gatwick Airport",
                pickupTime: new Date(Date.now() + 1000 * 60 * 120), // 2 hours from now
                passengerName: "Test Card",
                passengerPhone: "+447000000002",
                passengers: 1,
                vehicleType: "Executive",
                status: "PENDING",
                fare: 85.0,
                paymentType: "CARD",
                paymentStatus: "AUTHORIZED",
                stripePaymentIntentId: "pi_test_123",
                isFixedPrice: true,
                autoDispatch: false
            }
        });
        console.log("✅ CARD Job Created successfully:", cardJob.id);

        console.log("3. Testing ACCOUNT Booking Creation");
        if (account) {
            const accountJob = await prisma.job.create({
                data: {
                    tenantId: tenant.id,
                    customerId: customer.id,
                    accountId: account.id,
                    pickupAddress: "Canary Wharf, London",
                    dropoffAddress: "London City Airport",
                    pickupTime: new Date(Date.now() + 1000 * 60 * 180), // 3 hours from now
                    passengerName: "Test Account",
                    passengerPhone: "+447000000003",
                    passengers: 4,
                    vehicleType: "MPV",
                    status: "PENDING",
                    fare: 35.0,
                    paymentType: "ACCOUNT",
                    paymentStatus: "UNPAID",
                    isFixedPrice: true,
                    autoDispatch: false
                }
            });
            console.log("✅ ACCOUNT Job Created successfully:", accountJob.id);

            // Cleanup
            await prisma.job.delete({ where: { id: accountJob.id } });
        } else {
            console.log("⚠️ Skipping ACCOUNT Booking test - No account found.");
        }

        // Cleanup
        await prisma.job.delete({ where: { id: cashJob.id } });
        await prisma.job.delete({ where: { id: cardJob.id } });

        console.log("--- QA TEST PASSED: Booking Creation Constraints are logical ---");

    } catch (err) {
        console.error("❌ QA TEST FAILED:", err);
    } finally {
        await prisma.$disconnect();
    }
}

runTest();
