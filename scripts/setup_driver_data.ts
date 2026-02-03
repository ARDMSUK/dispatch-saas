
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log("Setting up Driver Test Data...");

    // 1. Get or Create Tenant
    let tenant = await prisma.tenant.findUnique({ where: { slug: 'zercabs' } });
    if (!tenant) {
        tenant = await prisma.tenant.create({
            data: {
                name: 'Zer Cabs',
                slug: 'zercabs',
                apiKey: 'test-api-key'
            }
        });
        console.log("Created Tenant:", tenant.name);
    } else {
        console.log("Using Tenant:", tenant.name);
    }

    // 2. Create/Update Driver
    const callsign = 'D-TEST';
    const pin = '1234'; // Plain text for now as per MVP decision in route

    let driver = await prisma.driver.findFirst({
        where: { tenantId: tenant.id, callsign }
    });

    if (driver) {
        driver = await prisma.driver.update({
            where: { id: driver.id },
            data: { pin, status: 'OFF_DUTY' }
        });
        console.log("Updated Driver:", driver.callsign);
    } else {
        driver = await prisma.driver.create({
            data: {
                tenantId: tenant.id,
                name: 'Test Driver',
                callsign,
                phone: '07000000000',
                email: 'driver@test.com',
                pin,
                status: 'OFF_DUTY'
            }
        });
        console.log("Created Driver:", driver.callsign);
    }

    // 3. Create a Job assigned to Driver
    const job = await prisma.job.create({
        data: {
            tenantId: tenant.id,
            driverId: driver.id,
            pickupAddress: '123 Test St',
            dropoffAddress: '456 Test Ave',
            pickupTime: new Date(Date.now() + 3600000), // 1 hour from now
            passengerName: 'Test Pax',
            passengerPhone: '07999999999',
            passengers: 1,
            status: 'ASSIGNED',
            paymentType: 'CASH',
            fare: 25.00
        }
    });
    console.log("Created Job:", job.id);

    console.log("Setup Complete.");
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
