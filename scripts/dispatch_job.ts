
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const slug = 'zercabs';
    const callsign = 'D-TEST';

    console.log(`Dispatching Job to ${callsign}...`);

    const tenant = await prisma.tenant.findUnique({ where: { slug } });
    const driver = await prisma.driver.findUnique({
        where: { tenantId_callsign: { tenantId: tenant!.id, callsign } }
    });

    if (!driver) throw new Error("Driver not found");

    // Create a job
    const job = await prisma.job.create({
        data: {
            tenantId: tenant!.id,
            driverId: driver.id, // Assign directly
            status: 'DISPATCHED', // Start as DISPATCHED (Offer)
            pickupAddress: 'Buckingham Palace',
            dropoffAddress: 'Tower of London',
            pickupTime: new Date(Date.now() + 1800000), // 30 mins
            passengerName: 'King Charles',
            passengerPhone: '07000111222',
            passengers: 2,
            fare: 15.50,
            paymentType: 'CASH'
        }
    });

    console.log(`Job ${job.id} dispatched to ${driver.callsign}`);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
