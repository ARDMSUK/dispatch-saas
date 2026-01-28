
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
    const tName = 'Demo Cabs Ltd'
    const tSlug = 'demo-cabs'
    const apiKey = 'demo-api-key-123' // For WP plugin testing

    // 1. Create Tenant
    let tenant = await prisma.tenant.findUnique({
        where: { slug: tSlug }
    })

    if (!tenant) {
        tenant = await prisma.tenant.create({
            data: {
                name: tName,
                slug: tSlug,
                apiKey: apiKey
            }
        })
        console.log(`Created Tenant: ${tenant.name} (${tenant.id})`)
    } else {
        // Ensure API Key exists
        if (!tenant.apiKey) {
            tenant = await prisma.tenant.update({
                where: { id: tenant.id },
                data: { apiKey: apiKey }
            })
            console.log(`Updated Tenant API Key`)
        }
    }

    // 2. Create Admin User
    const email = 'dispatcher@example.com'
    const password = 'password123'
    const hashedPassword = await bcrypt.hash(password, 10)

    const user = await prisma.user.upsert({
        where: { email },
        update: {
            password: hashedPassword,
            tenantId: tenant.id
        },
        create: {
            email,
            name: 'Dispatcher Joe',
            password: hashedPassword,
            role: 'DISPATCHER',
            tenantId: tenant.id
        }
    })
    console.log(`Upserted User: ${user.email}`)

    // 3. Create Drivers
    const driverData = [
        { name: 'John Smith', callsign: 'CAB-001', phone: '07700900001' },
        { name: 'Sarah Jones', callsign: 'CAB-002', phone: '07700900002' },
        { name: 'Mike Brown', callsign: 'CAB-003', phone: '07700900003' },
    ]

    for (const d of driverData) {
        await prisma.driver.upsert({
            where: { tenantId_callsign: { tenantId: tenant.id, callsign: d.callsign } },
            update: {},
            create: {
                ...d,
                tenantId: tenant.id
            }
        })
    }
    console.log(`Upserted ${driverData.length} Drivers`)

    // 4. Create Basic Pricing Rule (Saloon)
    await prisma.pricingRule.upsert({
        where: {
            tenantId_vehicleType: {
                tenantId: tenant.id,
                vehicleType: 'Saloon'
            }
        },
        update: {},
        create: {
            tenantId: tenant.id,
            name: 'Standard Tariff',
            vehicleType: 'Saloon',
            baseRate: 3.50,
            perMile: 2.20,
            minFare: 5.00
        }
    })
    console.log('Upserted Default Pricing Rule')
}

main()
    .then(async () => {
        await prisma.$disconnect()
    })
    .catch(async (e) => {
        console.error(e)
        await prisma.$disconnect()
        process.exit(1)
    })
