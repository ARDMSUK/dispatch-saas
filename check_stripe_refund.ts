import { PrismaClient } from '@prisma/client';
import { decrypt } from './src/lib/encryption';
import Stripe from 'stripe';

const prisma = new PrismaClient();

async function check() {
  const tenant = await prisma.tenant.findUnique({ where: { slug: 'bourneend' } });
  if (!tenant || !tenant.stripeSecretKey) {
    console.log("No tenant or secret key");
    return;
  }
  
  const decryptedKey = decrypt(tenant.stripeSecretKey);
  const stripe = new Stripe(decryptedKey as string, { apiVersion: '2025-01-27.acacia' as any });

  const refunds = await stripe.refunds.list({ payment_intent: 'pi_3TtZQQGAT4mov2QR0o3JK8hb' });
  console.log(JSON.stringify(refunds.data, null, 2));

  await prisma.$disconnect();
}
check();
