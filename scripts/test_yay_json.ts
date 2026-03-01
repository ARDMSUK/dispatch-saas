import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const tenant = await prisma.tenant.findFirst();
    if (!tenant) return;

    console.log("Simulating JSON payload for an answered call...");
    const res = await fetch(`http://localhost:3000/api/external/webhooks/calls?apiKey=${tenant.apiKey}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            "type": "user_inbound_call_answered",
            "caller_id": "07700900000"
        })
    });
    console.log("Webhook Status:", res.status);
    
    // Check if the call is actually dismissed in DB
    const calls = await prisma.incomingCall.findMany({
        where: { phone: '07700900000' }
    });
    console.log("DB Calls state:", calls);
}

main().catch(console.error);
