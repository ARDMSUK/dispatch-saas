import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const tenant = await prisma.tenant.findFirst();
    if (!tenant) return;
    console.log(`Using API Key: ${tenant.apiKey}`);
    
    // Simulate answered event from yay.com 
    const res = await fetch(`http://localhost:3000/api/external/webhooks/calls?apiKey=${tenant.apiKey}&phone=07700900000&event=answered`, {
        method: 'POST'
    });
    console.log("Status:", res.status);
    console.log("Body:", await res.text());
}

main().catch(console.error);
