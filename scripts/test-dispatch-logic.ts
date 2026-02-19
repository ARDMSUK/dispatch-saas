
import { prisma } from '../src/lib/prisma';

async function main() {
    console.log('--- Reproduction Script: Dispatch Logic ---');

    // 1. Create a Test Tenant
    const tenant = await prisma.tenant.upsert({
        where: { slug: 'dispatch-test-tenant' },
        update: {},
        create: {
            name: 'Dispatch Test',
            slug: 'dispatch-test-tenant',
            apiKey: 'dispatch-test-key'
        }
    });

    console.log('Tenant:', tenant.id);

    // 2. Create a Driver
    const driver = await prisma.driver.create({
        data: {
            name: 'Test Driver',
            callsign: 'TD1',
            phone: '+447000000000',
            tenantId: tenant.id,
            status: 'OFF_DUTY'
        }
    });

    console.log('Driver created:', driver.id, driver.status);

    // 3. Create a Job
    const job = await prisma.job.create({
        data: {
            pickupAddress: 'A',
            dropoffAddress: 'B',
            pickupTime: new Date(),
            passengerName: 'Test Pax',
            passengerPhone: '123',
            tenantId: tenant.id,
            status: 'PENDING'
        }
    });

    console.log('Job created:', job.id);

    // 4. Test "Manual Dispatch" (Assign Button) Logic -> calls PATCH /api/jobs/[id]
    // Expectation: Job status -> DISPATCHED, DriverId set. Driver Status -> UNCHANGED.
    console.log('\n--- Testing Manual Dispatch (PATCH /api/jobs/[id]) ---');

    // Mimic API Logic
    const updatedJob = await prisma.job.update({
        where: { id: job.id },
        data: {
            status: 'DISPATCHED',
            driverId: driver.id
        }
    });

    console.log('Job Updated:', updatedJob.status, updatedJob.driverId);

    const driverRefetched = await prisma.driver.findUnique({ where: { id: driver.id } });
    console.log('Driver Status (Should be OFF_DUTY):', driverRefetched?.status);

    // 5. Reset
    await prisma.job.update({ where: { id: job.id }, data: { status: 'PENDING', driverId: null } });
    console.log('\n--- Reset Job ---');

    // 6. Test "Dispatch Dialog" Logic -> calls PATCH /api/jobs/[id]/assign
    // Expectation: Job status -> DISPATCHED. Driver Status -> BUSY.
    console.log('\n--- Testing Dispatch Dialog (PATCH /api/jobs/[id]/assign) ---');

    // Mimic API Logic (Transaction)
    try {
        if (driverRefetched?.status === 'BUSY') throw new Error('Driver BUSY');

        const [jobTx, driverTx] = await prisma.$transaction([
            prisma.job.update({
                where: { id: job.id },
                data: { driverId: driver.id, status: 'DISPATCHED' }
            }),
            prisma.driver.update({
                where: { id: driver.id },
                data: { status: 'BUSY' }
            })
        ]);
        console.log('Transaction Success.');
        console.log('Job Status:', jobTx.status);
        console.log('Driver Status:', driverTx.status);

    } catch (e: any) {
        console.error('Transaction Failed:', e.message);
    }

    // Cleanup
    await prisma.job.delete({ where: { id: job.id } });
    await prisma.driver.delete({ where: { id: driver.id } });
    // await prisma.tenant.delete({ where: { id: tenant.id } });
    console.log('\n--- Cleanup Done ---');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
