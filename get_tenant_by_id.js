const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    const tenant = await prisma.tenant.findUnique({ where: { id: 'cmnfygx8e0001gcpt5cjwq2jp' } });
    console.log("Tenant receiving the calls:", tenant.name, tenant.slug);
}
main().finally(() => prisma.$disconnect());
