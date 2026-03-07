import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    const adminUser = await prisma.user.findFirst({
        where: { role: 'SUPER_ADMIN' }
    });

    const tenant = await prisma.tenant.findFirst();

    if (!tenant) {
        console.log("No tenant found!");
        return;
    }

    const hashedPin = await bcrypt.hash("1234", 10);

    const driver = await prisma.driver.create({
        data: {
            tenantId: tenant.id,
            callsign: "101",
            name: "Test Driver",
            phone: "+447700900000",
            pin: hashedPin,
            status: "FREE",
        }
    });

    console.log("Created Driver:", driver, "for tenant:", tenant.slug);
}

main().catch(console.error).finally(() => prisma.$disconnect());
