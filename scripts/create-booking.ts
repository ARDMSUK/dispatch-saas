
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    // 1. Find tenant
    let tenant = await prisma.tenant.findFirst();
    if (!tenant) throw new Error("No tenant found");

    // 2. Create Booking
    const job = await prisma.job.create({
        data: {
            tenantId: tenant.id,
            pickupAddress: "123 Test St",
            dropoffAddress: "456 Test Ave",
            pickupTime: new Date(),
            passengerName: "Test Passenger",
            passengerPhone: "1234567890",
            status: "PENDING",
            pickupLat: 51.5,
            pickupLng: -0.1,
            dropoffLat: 51.6,
            dropoffLng: -0.2,
        }
    });

    console.log(job.id);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
