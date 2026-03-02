import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const user = await prisma.user.findUnique({
        where: { email: 'digitaldmgency@gmail.com' }
    });

    if (user) {
        console.log(`User: ${user.email}`);
        console.log(`Role: ${user.role}`);
        console.log(`Permissions: ${JSON.stringify(user.permissions)}`);
    } else {
        console.log("User not found.");
    }
}

main()
    .then(async () => {
        await prisma.$disconnect();
    })
    .catch(async (e) => {
        console.error(e);
        await prisma.$disconnect();
        process.exit(1);
    });
