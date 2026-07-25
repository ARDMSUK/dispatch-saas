import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
async function main() {
  const nullCount = await prisma.tenant.count({ where: { subscriptionStatus: null } })
  console.log('Null count:', nullCount)
}
main().finally(() => prisma.$disconnect())
