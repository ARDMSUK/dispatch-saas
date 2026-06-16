import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const slug = 'bourneend';
    const callsign = '6';

    const tenant = await prisma.tenant.findUnique({ where: { slug } });
    if (!tenant) throw new Error("Tenant not found");

    const driver = await prisma.driver.findUnique({
        where: { tenantId_callsign: { tenantId: tenant.id, callsign } }
    });
    if (!driver) throw new Error("Driver not found");

    console.log(`Driver: ${driver.name} (ID: ${driver.id}), Current Status: ${driver.status}`);

    // Update driver status to FREE (Online)
    await prisma.driver.update({
        where: { id: driver.id },
        data: { status: 'FREE' }
    });
    console.log("Updated driver status to FREE");

    // Clean up any existing active jobs for this driver to avoid conflicts
    const activeJobs = await prisma.job.findMany({
        where: {
            driverId: driver.id,
            status: { in: ['DISPATCHED', 'EN_ROUTE', 'POB'] }
        }
    });

    if (activeJobs.length > 0) {
        console.log(`Found ${activeJobs.length} active jobs for this driver. Cancelling them...`);
        for (const activeJob of activeJobs) {
            await prisma.job.update({
                where: { id: activeJob.id },
                data: { status: 'CANCELLED' }
            });
            console.log(`Cancelled job ${activeJob.id}`);
        }
    }

    // Create a new job dispatched to driver 6
    const job = await prisma.job.create({
        data: {
            tenantId: tenant.id,
            driverId: driver.id,
            status: 'DISPATCHED', // Starts as DISPATCHED (Offered to driver)
            pickupAddress: 'Bourne End Parade Taxis, Bourne End',
            dropoffAddress: 'Cliveden House, Taplow',
            pickupTime: new Date(),
            passengerName: 'QA Test Rider',
            passengerPhone: '+447000000099',
            passengers: 1,
            fare: 25.50,
            paymentType: 'CASH',
            paymentStatus: 'UNPAID',
            isFixedPrice: true
        }
    });

    console.log(`Successfully created and dispatched job ${job.id} to Driver 6`);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
