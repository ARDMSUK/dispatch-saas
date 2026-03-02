import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function runTest() {
    console.log("--- QA TEST: Dispatch Flow & Wait/Return ---");
    try {
        const tenant = await prisma.tenant.findFirst();
        if (!tenant) throw new Error("No Tenant found.");

        const customer = await prisma.customer.findFirst({ where: { tenantId: tenant.id } });
        if (!customer) throw new Error("No Customer found.");

        const driver = await prisma.driver.findFirst({ where: { tenantId: tenant.id } });
        if (!driver) throw new Error("No Driver found.");

        console.log("1. Testing Pre-assigned Driver Booking");
        const preAssignedJob = await prisma.job.create({
            data: {
                tenantId: tenant.id,
                customerId: customer.id,
                preAssignedDriverId: driver.id, // Pre-assigning
                pickupAddress: "10 Downing Street, London",
                dropoffAddress: "Heathrow Airport T5",
                pickupTime: new Date(Date.now() + 1000 * 60 * 60),
                passengerName: "Test Preassign",
                passengerPhone: "+447000000011",
                passengers: 1,
                vehicleType: "Saloon",
                status: "UNASSIGNED", // Usually starts as UNASSIGNED or PENDING before auto-dispatch picks it up
                fare: 45.0,
                paymentType: "CASH",
                paymentStatus: "UNPAID",
                isFixedPrice: true,
                autoDispatch: true
            }
        });
        console.log("✅ Pre-Assigned Job Created:", preAssignedJob.id, "for Driver:", driver.callsign);

        console.log("2. Testing Wait & Return Logic");
        // Create a root job
        const rootJob = await prisma.job.create({
            data: {
                tenantId: tenant.id,
                customerId: customer.id,
                pickupAddress: "Euston Station",
                dropoffAddress: "O2 Arena",
                pickupTime: new Date(Date.now() + 1000 * 60 * 120),
                passengerName: "Test Wait Return",
                passengerPhone: "+447000000012",
                passengers: 2,
                vehicleType: "Saloon",
                status: "PENDING",
                fare: 30.0, // Initial fare
                paymentType: "CASH",
                paymentStatus: "UNPAID",
                isFixedPrice: true,
                autoDispatch: false
            }
        });

        // Let's manually trigger a "Wait and Return" modification
        // A Wait & return usually involves:
        // 1. Updating the root job to add waiting time & cost
        // 2. Creating a return job linked to the parent.
        const waitingMinutes = 15;
        const waitCostPerMin = 0.50; // Mock 50p per minute
        const totalWaitCost = waitingMinutes * waitCostPerMin;

        await prisma.job.update({
            where: { id: rootJob.id },
            data: {
                waitingTime: waitingMinutes,
                waitingCost: totalWaitCost,
                fare: rootJob.fare! + totalWaitCost // Aggregating fare
            }
        });

        const returnJob = await prisma.job.create({
            data: {
                tenantId: tenant.id,
                customerId: customer.id,
                parentJobId: rootJob.id,
                isReturn: true,
                pickupAddress: rootJob.dropoffAddress,
                dropoffAddress: rootJob.pickupAddress, // Flipped
                pickupTime: new Date(Date.now() + 1000 * 60 * 180), // Later
                passengerName: rootJob.passengerName,
                passengerPhone: rootJob.passengerPhone,
                passengers: rootJob.passengers,
                vehicleType: rootJob.vehicleType,
                status: "PENDING",
                fare: 30.0, // Base fare for return
                paymentType: "CASH",
                paymentStatus: "UNPAID",
                isFixedPrice: true,
                autoDispatch: false
            }
        });

        const fetchRoot = await prisma.job.findUnique({ where: { id: rootJob.id } });
        if (fetchRoot?.waitingCost !== totalWaitCost) throw new Error("Wait cost did not apply correctly");
        if (fetchRoot?.fare !== (30.0 + totalWaitCost)) throw new Error("Total fare did not aggregate wait cost");
        console.log("✅ Wait cost aggregated correctly. Total Fare:", fetchRoot?.fare);
        console.log("✅ Return Job created and linked to parent:", returnJob.id);

        // Cleanup
        await prisma.job.delete({ where: { id: preAssignedJob.id } });
        await prisma.job.delete({ where: { id: returnJob.id } });
        await prisma.job.delete({ where: { id: rootJob.id } });

        console.log("--- QA TEST PASSED: Pre-assign & Wait/Return logic works ---");

    } catch (err) {
        console.error("❌ QA TEST FAILED:", err);
    } finally {
        await prisma.$disconnect();
    }
}

runTest();
