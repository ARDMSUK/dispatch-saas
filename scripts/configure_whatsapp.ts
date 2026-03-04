import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const sandboxNumber = '+14155238886';
    
    // Find the primary System Administration tenant
    const tenant = await prisma.tenant.findFirst({
        where: { name: 'System Administration' }
    });

    if (!tenant) {
        console.error("System Administration tenant not found.");
        return;
    }

    console.log(`Found tenant: ${tenant.name} (ID: ${tenant.id})`);

    // Update the tenant configuration
    const updatedTenant = await prisma.tenant.update({
        where: { id: tenant.id },
        data: {
            hasWhatsAppAi: true,
            twilioFromNumber: sandboxNumber
        }
    });

    console.log(`✅ Successfully configured WhatsApp AI!`);
    console.log(`- Tenant: ${updatedTenant.name}`);
    console.log(`- WhatsApp AI: ${updatedTenant.hasWhatsAppAi ? 'Enabled' : 'Disabled'}`);
    console.log(`- Linked Number: ${updatedTenant.twilioFromNumber}`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
