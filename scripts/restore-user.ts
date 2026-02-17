
import { prisma } from "../src/lib/prisma";
import bcrypt from "bcryptjs";

async function main() {
    const email = "bahmed.work@gmail.com";
    const password = "password";
    const hashedPassword = await bcrypt.hash(password, 10);

    // Check if user already exists (just in case)
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
        console.log("User already exists. Skipping creation.");
        return;
    }

    // Create new tenant
    // Use a timestamp to ensure uniqueness just in case
    const tenantSlug = "dispatch-private-hire-" + Date.now();
    const tenant = await prisma.tenant.create({
        data: {
            name: "Dispatch Private Hire",
            slug: tenantSlug,
            email: "admin@dispatch.com",
            phone: "07970586381",
            apiKey: "key_" + Math.random().toString(36).substring(7),
        }
    });

    console.log(`Created new tenant: ${tenant.name} (${tenant.slug})`);

    // Create user
    const user = await prisma.user.create({
        data: {
            email,
            password: hashedPassword,
            name: "AR",
            role: "ADMIN",
            tenantId: tenant.id
        }
    });

    console.log(`Restored user ${email} with password '${password}'`);
    console.log(`Linked to tenant ID: ${tenant.id}`);
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
