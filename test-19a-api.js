const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  try {
    console.log('Sending POST to /api/booker/bourneend/book...');
    const res = await fetch('https://app.cabai.co.uk/api/booker/bourneend/book', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pickup: 'Bourne End Station',
        dropoff: 'High Wycombe Station',
        pickupTime: new Date(Date.now() + 86400000).toISOString(),
        vehicleType: 'Saloon',
        passengerName: 'Test User 19A',
        passengerEmail: 'test19a@cabai.co.uk',
        passengerPhone: '07700900192',
        passengers: '1',
        luggage: '0',
        notes: 'API Test',
        paymentType: 'CASH',
        turnstileToken: 'dummy' 
      })
    });
    
    const data = await res.json();
    console.log('API Response:', data);

    console.log('\n--- CHECKING DB ---');
    const job = await prisma.job.findFirst({
        where: { passengerEmail: 'test19a@cabai.co.uk' },
        orderBy: { bookedAt: 'desc' },
        include: { ActivityLog: true }
    });

    if (job) {
      console.log('Job found:');
      console.log(`ID: ${job.id}`);
      console.log(`Status: ${job.status}`);
      console.log(`Payment Status: ${job.paymentStatus}`);
      console.log(`Payment Type: ${job.paymentType}`);
      console.log(`Notes: ${job.notes}`);
      console.log(`Logs:`, job.ActivityLog.map(l => l.action).join(', '));
    } else {
      console.log('Job not found in DB.');
    }
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}
run();
