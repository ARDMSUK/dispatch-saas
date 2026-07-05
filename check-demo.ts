import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const tenant = await prisma.tenant.findUnique({
    where: { id: 'demo-taxis' }
  });
  
  if (!tenant) {
    console.log("Tenant demo-taxis not found");
    return;
  }
  
  const mask = (s: string | null) => s ? `${s.substring(0, 8)}...${s.substring(s.length - 4)}` : null;

  console.log("Tenant Name:", tenant.name);
  console.log("stripeSecretKey:", mask(tenant.stripeSecretKey));
  console.log("stripePublishableKey:", mask((tenant as any).stripePublishableKey || null));
}

main().catch(console.error).finally(() => prisma.$disconnect());
