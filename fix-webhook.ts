import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
    // 1. Force the DB status to CONNECTED
    await prisma.tenant.updateMany({
        where: { whatsappInstanceStatus: 'CONNECTING' },
        data: { whatsappInstanceStatus: 'CONNECTED' }
    });

    console.log("DB status updated to CONNECTED.");

    // 2. Set webhook on Evolution API
    const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || "https://evolution-api-production-74d6.up.railway.app";
    const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || "Greenstar520420";
    const NEXT_PUBLIC_BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://app.cabai.co.uk";
    
    // Check if EVOLUTION variables are set locally. If not, script will use defaults which might be wrong
    console.log(`Using Gateway: ${EVOLUTION_API_URL}`);

    const res = await fetch(`${EVOLUTION_API_URL}/webhook/set/t_cmnfygx8e0_1775920648025`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': EVOLUTION_API_KEY },
        body: JSON.stringify({
            webhook: {
                enabled: true,
                url: `${NEXT_PUBLIC_BASE_URL}/api/whatsapp/webhook`,
                byEvents: false,
                base64: false,
                events: ['MESSAGES_UPSERT', 'CONNECTION_UPDATE']
            }
        })
    });
    
    const body = await res.text();
    console.log("Gateway Webhook Response:", res.status, body);
}

run()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
