
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verify() {
    console.log("Starting Auto-Dispatch Verification...");

    const SLUG = 'zercabs';
    const tenant = await prisma.tenant.findUnique({ where: { slug: SLUG } });
    if (!tenant) throw new Error("Tenant not found");

    // 1. Setup Data
    console.log("[1] Setting up 3 Pending Jobs and 1 Free Driver...");

    // Clear existing pending jobs for clean test? Or just add new ones.

    // Free Driver
    const driver = await prisma.driver.create({
        data: {
            tenantId: tenant.id,
            name: 'Auto Driver',
            callsign: 'AUTO-1',
            phone: '07000000001',
            status: 'FREE' // Explicitly FREE
        }
    });

    // Pending Job 1
    const job1 = await prisma.job.create({
        data: {
            tenantId: tenant.id,
            pickupAddress: 'Pending St 1',
            dropoffAddress: 'Dest St 1',
            pickupTime: new Date(Date.now() + 1800000), // 30 mins
            passengerName: 'Pending Pax 1',
            passengerPhone: '07000000002',
            status: 'PENDING'
        }
    });

    // Pending Job 2
    const job2 = await prisma.job.create({
        data: {
            tenantId: tenant.id,
            pickupAddress: 'Pending St 2',
            dropoffAddress: 'Dest St 2',
            pickupTime: new Date(Date.now() + 3600000), // 60 mins
            passengerName: 'Pending Pax 2',
            passengerPhone: '07000000003',
            status: 'PENDING'
        }
    });

    console.log(`Created Driver ${driver.callsign} and Jobs ${job1.id}, ${job2.id}`);

    // 2. Run Dispatch
    console.log("\n[2] Triggering Dispatch API...");
    const res = await fetch('http://localhost:3000/api/dispatch/auto', {
        method: 'POST'
    });

    const result = await res.json();
    console.log("Dispatch Result:", JSON.stringify(result, null, 2));

    // 3. Verify Assignments
    console.log("\n[3] Verifying Database State...");

    const updatedJob1 = await prisma.job.findUnique({ where: { id: job1.id } });
    const updatedJob2 = await prisma.job.findUnique({ where: { id: job2.id } });
    const updatedDriver = await prisma.driver.findUnique({ where: { id: driver.id } });

    console.log(`Job ${job1.id} Status: ${updatedJob1.status} (Driver: ${updatedJob1.driverId})`);
    console.log(`Job ${job2.id} Status: ${updatedJob2.status} (Driver: ${updatedJob2.driverId})`);
    console.log(`Driver ${driver.callsign} Status: ${updatedDriver.status}`);

    // Expecting Job 1 to be ASSIGNED, Driver BUSY. Job 2 PENDING.

    // Cleanup
    await prisma.job.deleteMany({ where: { id: { in: [job1.id, job2.id] } } });
    await prisma.driver.delete({ where: { id: driver.id } });
    console.log("\nCleanup Complete.");
}

verify()
    .catch(console.error)
    .finally(async () => {
        await prisma.$disconnect();
    });
