
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
    const hashedPassword = await bcrypt.hash('password123', 10);

    // Get tenant
    const tenant = await prisma.tenant.findFirst();

    const user = await prisma.user.upsert({
        where: { email: 'test@test.com' },
        update: { password: hashedPassword },
        create: {
            email: 'test@test.com',
            password: hashedPassword,
            name: 'Test User',
            role: 'DISPATCHER',
            tenantId: tenant.id
        }
    });
    console.log('Created/Updated User:', user);
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
