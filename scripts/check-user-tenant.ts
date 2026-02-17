
import { prisma } from "../src/lib/prisma";

async function main() {
    const email = "bahmed.work@gmail.com";
    console.log(`Checking user with email: ${email}`);
    const user = await prisma.user.findUnique({
        where: { email },
        include: { tenant: true }
    });

    if (user) {
        console.log("User found:", user.id);
    } else {
        console.log("User not found.");
    }

    console.log("Checking all tenants...");
    const tenants = await prisma.tenant.findMany();
    console.log(`Found ${tenants.length} tenants.`);
    tenants.forEach(t => console.log(`- ${t.name} (${t.slug}) ID: ${t.id}`));
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
