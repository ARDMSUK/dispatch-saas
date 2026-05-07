const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    const tenant = await prisma.tenant.findUnique({ where: { slug: 'bourneend' }, include: { users: true } });
    if (tenant) {
        console.log("Tenant:", tenant.name, "Email:", tenant.email);
        console.log("Users:");
        tenant.users.forEach(u => console.log(u.email, u.role));
    } else {
        console.log("Tenant not found");
    }
}
main().finally(() => prisma.$disconnect());
