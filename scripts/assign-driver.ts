
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const jobId = process.argv[2] ? parseInt(process.argv[2]) : 43;

    console.log(`Assigning driver to job ${jobId}...`);

    // 1. Find or create a tenant first (needed for driver)
    let tenant = await prisma.tenant.findFirst();
    if (!tenant) {
        tenant = await prisma.tenant.create({
            data: {
                name: "Test Company",
                slug: "test-co",
                email: "test@example.com"
            }
        });
        console.log("Created test tenant");
    }

    // 2. Find or create a driver
    let driver = await prisma.driver.findFirst({
        where: { tenantId: tenant.id }
    });

    if (!driver) {
        driver = await prisma.driver.create({
            data: {
                name: "Test Driver",
                callsign: "TEST-01",
                phone: "07700900000",
                tenantId: tenant.id,
                status: "FREE",
                location: JSON.stringify({ lat: 51.5074, lng: -0.1278 })
            }
        });
        console.log("Created test driver:", driver.name);
    } else {
        console.log("Found existing driver:", driver.name);
    }

    // 3. Assign driver to job
    try {
        const updatedJob = await prisma.job.update({
            where: { id: jobId },
            data: {
                status: "ASSIGNED",
                driverId: driver.id
            }
        });
        console.log("Successfully assigned driver to job:", updatedJob.id);
    } catch (e) {
        console.error("Failed to assign driver:", e);
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
