
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
    const email = 'digitaldmgency@gmail.com'
    const password = 'password123'

    console.log(`🔍 Verifying user: ${email}`)

    const user = await prisma.user.findUnique({
        where: { email },
        include: { tenant: true }
    })

    if (!user) {
        console.error("❌ User NOT FOUND in database.")
        return
    }

    console.log("✅ User found:", user.id)
    console.log("   Role:", user.role)
    console.log("   Tenant:", user.tenant?.name)

    const match = await bcrypt.compare(password, user.password)

    if (match) {
        console.log("✅ Password validation PASSED.")
    } else {
        console.error("❌ Password validation FAILED.")
        console.log("   Hash in DB:", user.password)
    }
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
