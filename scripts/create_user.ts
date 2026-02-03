
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
    const email = 'digitaldmgency@gmail.com'
    const password = 'password123'
    const hashedPassword = await bcrypt.hash(password, 10)

    console.log(`Creating user for ${email}...`)

    // 1. Create Tenant
    let tenant = await prisma.tenant.findUnique({
        where: { slug: 'demo-taxis' }
    })

    if (!tenant) {
        console.log("Creating 'Demo Taxis' tenant...")
        tenant = await prisma.tenant.create({
            data: {
                name: 'Demo Taxis',
                slug: 'demo-taxis',
                apiKey: 'demo-api-key'
            }
        })
    }

    // 2. Create User
    const user = await prisma.user.upsert({
        where: { email },
        update: {
            password: hashedPassword,
            tenantId: tenant.id,
            role: 'DISPATCHER',
            name: 'Demo User'
        },
        create: {
            email,
            password: hashedPassword,
            name: 'Demo User',
            role: 'DISPATCHER',
            tenantId: tenant.id
        }
    })

    console.log(`✅ User created!`)
    console.log(`📧 Email: ${email}`)
    console.log(`🔑 Password: ${password}`)
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
