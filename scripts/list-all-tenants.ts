
import { prisma } from "../src/lib/prisma";

async function main() {
    const tenants = await prisma.tenant.findMany({
        include: {
            _count: {
                select: { drivers: true, vehicles: true, jobs: true }
            }
        }
    });

    console.log("--- TENANTS ---");
    tenants.forEach(t => {
        console.log(`ID: ${t.id} | Name: ${t.name} | Slug: ${t.slug} | Drivers: ${t._count.drivers} | Jobs: ${t._count.jobs}`);
    });

    const users = await prisma.user.findMany({
        select: { email: true, role: true, tenantId: true }
    });
    console.log("\n--- USERS ---");
    users.forEach(u => {
        console.log(`Email: ${u.email} | Role: ${u.role} | Tenant: ${u.tenantId}`);
    });
}

main()
    .catch(console.error)
    .finally(async () => await prisma.$disconnect());
