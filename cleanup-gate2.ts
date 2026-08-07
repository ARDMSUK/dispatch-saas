import { prisma } from './src/lib/prisma';

async function cleanup() {
    console.log("Connecting to DB:", process.env.DATABASE_URL);
    
    // Find our Test Tenant
    const testTenant = await prisma.tenant.findFirst({
        where: { name: "Test Tenant" }
    });

    if (testTenant) {
        // Delete all drivers
        await prisma.driver.deleteMany({
            where: { tenantId: testTenant.id }
        });

        // Delete all bookings (jobs)
        await prisma.job.deleteMany({
            where: { tenantId: testTenant.id }
        });

        // Delete all customers
        await prisma.customer.deleteMany({
            where: { tenantId: testTenant.id }
        });

        // Delete the tenant
        await prisma.tenant.delete({
            where: { id: testTenant.id }
        });

        console.log(`Successfully cleaned up test tenant: ${testTenant.id}`);
    } else {
        console.log("No Test Tenant found.");
    }
}

cleanup().catch(console.error).finally(() => process.exit(0));
