import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const user = await prisma.user.update({
    where: { email: 'digitaldmagency@gmail.com' },
    data: { forcePasswordReset: true },
  })
  console.log(`Updated user ${user.email} to have forcePasswordReset = true`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
