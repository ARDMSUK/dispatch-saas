import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const tenant = await prisma.tenant.findFirst();
    if (!tenant || !tenant.apiKey) {
        console.error("No tenant or api key found.");
        return;
    }

    console.log(`Using API Key: ${tenant.apiKey}`);
    
    // Simulate an incoming ringing call
    const ringRes = await fetch(`http://localhost:3000/api/external/webhooks/calls?apiKey=${tenant.apiKey}&phone=07700900000&event=ringing`, {
        method: 'POST'
    });
    console.log("Ringing Response:", ringRes.status, await ringRes.text());
    
    // Check active calls
    const activeRes1 = await fetch(`http://localhost:3000/api/dispatch/calls/active`, {
        headers: {
            'cookie': 'next-auth.session-token=mock' // this won't work easily from a script without a lot of mocking
        }
    });

    // Simulate answering the call
    const answerRes = await fetch(`http://localhost:3000/api/external/webhooks/calls?apiKey=${tenant.apiKey}&phone=07700900000&event=answered`, {
        method: 'POST'
    });
    console.log("Answered Response:", answerRes.status, await answerRes.text());

    // Check DB
    const calls = await prisma.incomingCall.findMany({
        where: { phone: '07700900000' }
    });
    console.log("DB State:", calls);
}

main().catch(console.error);
