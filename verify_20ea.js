const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const tenant = await prisma.tenant.findUnique({
        where: { id: 'cmotadopt00081184tr3olkzc' },
        include: { drivers: true }
    });

    console.log("1. autoDispatch:", tenant.settings?.autoDispatch === true ? "true" : "false");
    
    const onlineDrivers = tenant.drivers.filter(d => d.status === 'ONLINE' || d.status === 'AVAILABLE');
    console.log("2. Online driver count:", onlineDrivers.length);
    
    const allOffDuty = tenant.drivers.every(d => d.status === 'OFF_DUTY' || d.status === 'BUSY'); // Wait, BUSY is unavailable for new jobs
    const justOffDuty = tenant.drivers.every(d => d.status === 'OFF_DUTY');
    
    let unavailableCount = 0;
    tenant.drivers.forEach(d => {
        if (d.status !== 'ONLINE' && d.status !== 'AVAILABLE' && d.status !== 'FREE') {
            unavailableCount++;
        }
    });
    console.log("3. Total unavailable drivers:", unavailableCount, "out of", tenant.drivers.length);
    
    const specificIds = ['994980', '996443', '992117', '990739', '6'];
    const specificDrivers = tenant.drivers.filter(d => specificIds.includes(d.callsign));
    console.log("4. Specific drivers statuses:");
    specificDrivers.forEach(d => {
        console.log(`   - ${d.name} (${d.callsign}): ${d.status}`);
    });

    console.log("5. stripeSecretKey exists:", !!tenant.stripeSecretKey);
    console.log("6. stripeSecretKey is enc:v1:", tenant.stripeSecretKey?.startsWith('enc:v1:'));
    console.log("7. paymentRouting:", tenant.settings?.paymentRouting || 'CENTRAL');
}

main().catch(console.error).finally(() => prisma.$disconnect());
