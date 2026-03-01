import { prisma } from '../src/lib/prisma';
import { createMocks } from 'node-mocks-http';
import { POST } from '../src/app/api/driver/jobs/[id]/status/route';
import { signDriverToken } from '../src/lib/driver-auth';

async function main() {
    console.log("--- Starting In-Car Payments Test ---");

    // 1. Setup Tenant & Driver
    const tenant = await prisma.tenant.findFirst();
    if (!tenant) throw new Error("No Tenant found.");

    let driver = await prisma.driver.findFirst({ where: { tenantId: tenant.id } });
    if (!driver) {
        driver = await prisma.driver.create({
            data: {
                name: "SumUp Test Driver",
                callsign: "S01",
                email: "sumup@example.com",
                phone: "+447700900111",
                pin: "1234",
                status: "FREE",
                tenantId: tenant.id
            }
        });
    }

    // 2. Create a Mock Job Assigned to Driver
    const job = await prisma.job.create({
        data: {
            tenantId: tenant.id,
            pickupAddress: "Card Testing Station",
            dropoffAddress: "Bank of England",
            pickupTime: new Date(),
            passengerName: "Mr Spender",
            passengerPhone: "+447700900222",
            vehicleType: "Saloon",
            fare: 25.50,
            paymentType: "CASH", // Default from dispatch
            paymentStatus: "UNPAID",
            status: "POB", // Passenger on Board - ready to complete
            driverId: driver.id
        }
    });

    console.log(`Created Job ID: ${job.id} for Driver: ${driver.callsign}`);

    // 3. Generate Driver Token using the App's native module
    const token = await signDriverToken({
        driverId: driver.id,
        tenantId: tenant.id,
        name: driver.name,
        callsign: driver.callsign
    });

    // 4. Simulate the API Call for "COMPLETE JOB" using "IN_CAR_TERMINAL"
    console.log("Simulating Driver tapping 'Card Terminal' payment...");

    // Create Mock Request using standard Fetch API Request object
    const req = new Request(`http://localhost:3000/api/driver/jobs/${job.id}/status`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            status: 'COMPLETED',
            paymentType: 'IN_CAR_TERMINAL'
        })
    });

    const paramsPromise = Promise.resolve({ id: String(job.id) });
    const response = await POST(req, { params: paramsPromise });

    console.log(`API Response Status: ${response.status}`);
    const resBody = await response.json();

    if (response.status !== 200) {
        console.error("Failed to complete job:", resBody);
        process.exit(1);
    }

    // 5. Verify Database State
    const updatedJob = await prisma.job.findUnique({ where: { id: job.id } });

    if (updatedJob?.status === 'COMPLETED' && updatedJob?.paymentType === 'IN_CAR_TERMINAL' && updatedJob?.paymentStatus === 'PAID') {
        console.log("✅ SUCCESS:");
        console.log(`Job Status: ${updatedJob.status}`);
        console.log(`Payment Type: ${updatedJob.paymentType}`);
        console.log(`Payment Status: ${updatedJob.paymentStatus}`);
    } else {
        console.log("❌ FAILURE: Job state did not update correctly.");
        console.log(updatedJob);
        process.exit(1);
    }
}

main()
    .catch(console.error)
    .finally(async () => {
        await prisma.$disconnect();
    });
