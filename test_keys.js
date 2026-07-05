const Stripe = require('stripe');
const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testKey(source, key) {
  if (!key) {
    console.log(`\nsource: ${source}\nmasked key suffix: none\naccount ID returned by stripe.accounts.retrieve(): N/A\npaymentIntent retrieve result: N/A\nerror code if failed: N/A\nerror message if failed: N/A\nlivemode: N/A`);
    return;
  }
  
  const maskedKey = key.substring(0, 8) + '...' + key.substring(key.length - 4);
  const stripe = new Stripe(key);
  
  let accountId = 'unknown';
  try {
    const account = await stripe.accounts.retrieve();
    accountId = account.id;
  } catch (e) {
    accountId = 'error: ' + e.code;
  }

  let piResult = 'unknown';
  let errCode = 'none';
  let errMsg = 'none';
  let livemode = 'unknown';
  
  try {
    const pi = await stripe.paymentIntents.retrieve('pi_3TmXhBGAT4mov2QR0cSgIUFC');
    piResult = 'success';
    livemode = pi.livemode;
  } catch (e) {
    piResult = 'failed';
    errCode = e.code || e.type;
    errMsg = e.message;
  }

  console.log(`\nsource: ${source}\nmasked key suffix: ${maskedKey}\naccount ID returned by stripe.accounts.retrieve(): ${accountId}\npaymentIntent retrieve result: ${piResult}\nerror code if failed: ${errCode}\nerror message if failed: ${errMsg}\nlivemode: ${livemode}`);
}

async function main() {
  const envVercel = fs.readFileSync('.env.vercel', 'utf8');
  const vercelMatch = envVercel.match(/STRIPE_SECRET_KEY=\"(.*)\"/);
  const vercelKey = vercelMatch ? vercelMatch[1] : null;
  
  const envLocal = fs.readFileSync('.env', 'utf8');
  const localMatch = envLocal.match(/STRIPE_SECRET_KEY=\"(.*)\"/);
  const localKey = localMatch ? localMatch[1] : null;

  const tenant = await prisma.tenant.findUnique({ where: { id: 'cmotadopt00081184tr3olkzc' } });
  const tenantKey = tenant ? tenant.stripeSecretKey : null;

  await testKey('Vercel production STRIPE_SECRET_KEY', vercelKey);
  await testKey('local .env STRIPE_SECRET_KEY', localKey);
  await testKey('tenant cmotadopt00081184tr3olkzc DB stripeSecretKey', tenantKey);
}

main().catch(console.error).finally(() => prisma.$disconnect());
