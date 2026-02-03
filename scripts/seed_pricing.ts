import { prisma } from '../src/lib/prisma';

async function main() {
    console.log("Seeding Pricing...");

    // Get Tenant
    let tenant = await prisma.tenant.findUnique({ where: { slug: 'demo-taxis' } });
    if (!tenant) {
        console.log("Creating demo tenant...");
        tenant = await prisma.tenant.create({
            data: {
                name: 'Demo Taxis',
                slug: 'demo-taxis',
                apiKey: 'demo-key-123'
            }
        });
    }

    // 1. Create Rules
    console.log("Creating Rules...");
    await prisma.pricingRule.upsert({
        where: {
            tenantId_vehicleType: {
                tenantId: tenant.id,
                vehicleType: 'Saloon'
            }
        },
        update: {
            baseRate: 4.00,
            perMile: 2.20,
            minFare: 8.00
        },
        create: {
            tenantId: tenant.id,
            name: 'Standard Saloon',
            vehicleType: 'Saloon',
            baseRate: 4.00,
            perMile: 2.20,
            minFare: 8.00
        }
    });

    await prisma.pricingRule.upsert({
        where: {
            tenantId_vehicleType: {
                tenantId: tenant.id,
                vehicleType: 'Executive'
            }
        },
        update: {
            baseRate: 6.00,
            perMile: 3.50,
            minFare: 15.00
        },
        create: {
            tenantId: tenant.id,
            name: 'Executive Class',
            vehicleType: 'Executive',
            baseRate: 6.00,
            perMile: 3.50,
            minFare: 15.00
        }
    });

    // 2. Create Fixed Price
    console.log("Creating Fixed Prices...");
    await prisma.fixedPrice.create({
        data: {
            tenantId: tenant.id,
            name: 'Heathrow Special',
            pickup: 'High Wycombe',
            dropoff: 'Heathrow Airport',
            price: 45.00,
            vehicleType: 'Saloon'
        }
    });

    console.log("Seeding Complete.");
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
