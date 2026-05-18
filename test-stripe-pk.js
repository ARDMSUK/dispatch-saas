const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const t = await prisma.tenant.findUnique({ where: { slug: 'bourneend' } });
  console.log(t.stripePublishableKey ? t.stripePublishableKey.substring(0, 10) + '...' : 'null');
}
main();
