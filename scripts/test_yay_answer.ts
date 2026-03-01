import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const tenant = await prisma.tenant.findFirst();
    if (!tenant) return;

    // Simulate answered event from yay.com (often they send "answered", "Answered", or just hangup)
    // Let's create a ringing call first directly in DB to bypass the local fetch hangs
    
    // Clear old test data
    await prisma.incomingCall.deleteMany({ where: { phone: '07700900000' }});

    console.log("1. Creating ringing call...");
    const call = await prisma.incomingCall.create({
        data: {
            tenantId: tenant.id,
            phone: '07700900000',
            status: 'RINGING'
        }
    });
    console.log("Ringing call created:", call.id);

    console.log("2. Simulating Yay.com answered webhook...");
    // Let's try different casings of "answered" because Yay might send title case
    for (const yayEvent of ['answered', 'Answered', 'ANSWERED', 'answered_call']) {
        console.log(`\nTesting Yay event: ${yayEvent}`);
        const res = await fetch(`http://localhost:3000/api/external/webhooks/calls?apiKey=${tenant.apiKey}&phone=07700900000&event=${yayEvent}`, {
            method: 'POST'
        });
        console.log("Status:", res.status);
    }
}

main().catch(console.error);
