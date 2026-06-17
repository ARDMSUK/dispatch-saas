import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const plans = [
    {
      name: 'SOLO',
      priceWeekly: 20.0,
      pricePerDriverWeekly: 0.0,
      incZonePricing: false,
      incDynamicPricing: false,
      incAutoDispatch: false,
      incWaitReturn: false,
      incWebBooker: false,
      incB2bPortal: false,
      incWavOptions: false,
      incLiveTracking: true,
      incFlightTracking: false,
    },
    {
      name: 'STANDARD',
      priceWeekly: 89.0,
      pricePerDriverWeekly: 0.0,
      incZonePricing: true,
      incDynamicPricing: true,
      incAutoDispatch: true,
      incWaitReturn: true,
      incWebBooker: true,
      incB2bPortal: true,
      incWavOptions: true,
      incLiveTracking: true,
      incFlightTracking: false,
    },
    {
      name: 'ADVANCED',
      priceWeekly: 69.0,
      pricePerDriverWeekly: 4.99,
      incZonePricing: true,
      incDynamicPricing: true,
      incAutoDispatch: true,
      incWaitReturn: true,
      incWebBooker: true,
      incB2bPortal: true,
      incWavOptions: true,
      incLiveTracking: true,
      incFlightTracking: true,
    },
    {
      name: 'CUSTOM',
      priceWeekly: 0.0,
      pricePerDriverWeekly: 0.0,
      incZonePricing: true,
      incDynamicPricing: true,
      incAutoDispatch: true,
      incWaitReturn: true,
      incWebBooker: true,
      incB2bPortal: true,
      incWavOptions: true,
      incLiveTracking: true,
      incFlightTracking: true,
    }
  ];

  for (const plan of plans) {
    const existing = await prisma.saasPlan.findFirst({ where: { name: plan.name } });
    if (existing) {
      await prisma.saasPlan.update({
        where: { id: existing.id },
        data: plan
      });
      console.log(`Updated plan ${plan.name}`);
    } else {
      await prisma.saasPlan.create({ data: plan });
      console.log(`Created plan ${plan.name}`);
    }
  }

  console.log('Seeded SaaS Plans Successfully');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
