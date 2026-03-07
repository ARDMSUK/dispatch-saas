const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
    const tenantSlug = 'qa-live-1772624396013';

    // Get the QA tenant
    const tenant = await prisma.tenant.findUnique({
        where: { slug: tenantSlug }
    });

    if (!tenant) {
        throw new Error(`Tenant ${tenantSlug} not found.`);
    }

    // Get the primary dev driver to assign the job to
    const driver = await prisma.driver.findFirst({
        where: { tenantId: tenant.id, callsign: '101' }
    });

    if (!driver) {
        throw new Error(`Driver 101 not found for tenant.`);
    }

    // Create a dummy accepted booking
    const job = await prisma.job.create({
        data: {
            tenantId: tenant.id,
            status: 'EN_ROUTE',
            pickupAddress: "Euston Station, London",
            pickupLat: 51.52834,
            pickupLng: -0.13317,
            dropoffAddress: "London Eye, London",
            dropoffLat: 51.5033,
            dropoffLng: -0.1195,
            pickupTime: new Date(Date.now() + 15 * 60000), // Pickup in 15m
            passengerName: "Live Tracking Tester",
            passengerPhone: "07700900000",
            vehicleType: "Saloon",
            fare: 25.00,
            driverId: driver.id
        }
    });

    console.log(`✅ Seeded tracking Job ID: ${job.id}`);
    console.log(`Driver Location set to: ${driver.currentLat}, ${driver.currentLng}`);
    console.log(`Open in Browser -> http://localhost:8082/?tenant=${tenantSlug}#/tracking/${job.id}`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
