
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
    const email = 'dispatcher@example.com'
    const password = 'password123'
    const hashedPassword = await bcrypt.hash(password, 10)

    // 1. Get or Create Tenant
    let tenant = await prisma.tenant.findUnique({
        where: { slug: 'demo-cabs' }
    })

    if (!tenant) {
        tenant = await prisma.tenant.create({
            data: {
                name: 'Demo Cabs Ltd',
                slug: 'demo-cabs',
            }
        })
        console.log('Created Tenant:', tenant.name)
    }

    // 2. Upsert User
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

    console.log({ user })
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
