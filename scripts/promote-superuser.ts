
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const email = 'digitaldmgency@gmail.com'; // The dev user

    console.log(`Promoting ${email} to SUPER_ADMIN...`);

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
        console.error("User not found!");
        return;
    }

    await prisma.user.update({
        where: { email },
        data: { role: 'SUPER_ADMIN' }
    });

    console.log("Success! User is now a SUPER_ADMIN.");
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
