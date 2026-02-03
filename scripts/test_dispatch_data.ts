import { prisma } from '../src/lib/prisma';

async function main() {
    console.log("Creating dummy driver and job...");

    // Get Tenant
    const tenant = await prisma.tenant.findUnique({ where: { slug: 'demo-taxis' } });
    if (!tenant) throw new Error("Tenant not found");

    // Create Driver
    const driver = await prisma.driver.create({
        data: {
            tenantId: tenant.id,
            name: "Stig",
            callsign: "STIG",
            phone: "+447000000000",
            status: "FREE",
            location: JSON.stringify({ lat: 51.5204, lng: -0.1178 }), // Near Kings Cross
            vehicles: {
                create: {
                    tenantId: tenant.id,
                    reg: "ST1G",
                    make: "Koenigsegg",
                    model: "CCX",
                    type: "Executive"
                }
            }
        }
    });
    console.log("Created Driver: STIG");

    // Create Booking
    const job = await prisma.job.create({
        data: {
            tenantId: tenant.id,
            pickupAddress: "King's Cross Station, London",
            dropoffAddress: "The Shard, London",
            passengerName: "Jeremy Clarkson",
            passengerPhone: "+447000000001",
            pickupTime: new Date(Date.now() + 3600000), // 1 hour from now
            status: "TO_DISPATCH",
            fare: 45.00
        }
    });

    console.log(`Created Job #${job.id} for Jeremy Clarkson`);
}

main()
    .then(async () => {
        await prisma.$disconnect();
    })
    .catch(async (e) => {
        console.error(e);
        await prisma.$disconnect();
        process.exit(1);
    });
