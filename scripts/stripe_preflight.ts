import { PrismaClient } from '@prisma/client';
import Stripe from 'stripe';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const prisma = new PrismaClient();

async function run() {
    console.log("--- Stripe Preflight Check ---");
    
    const targetUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    console.log(`1. Target URL: ${targetUrl}`);
    if (!targetUrl.includes('app.cabai.co.uk')) {
        if (process.env.ALLOW_NON_PRODUCTION_STRIPE_PREFLIGHT !== 'true') {
            console.error("ERROR: Not targeting live production URL. Exit unless ALLOW_NON_PRODUCTION_STRIPE_PREFLIGHT=true");
            process.exit(1);
        } else {
            console.warn("WARNING: Running non-production Stripe preflight intentionally.");
        }
    }
    
    const tenant = await prisma.tenant.findFirst({ where: { name: 'London Exec Test' } });
    if (!tenant) throw new Error("Tenant 'London Exec Test' not found.");
    console.log(`2. Tenant: ${tenant.name} (${tenant.id})`);
    
    const keySource = tenant.stripeSecretKey ? 'Tenant DB' : 'Local/Vercel Env';
    const apiKey = tenant.stripeSecretKey || process.env.STRIPE_SECRET_KEY;
    console.log(`3. Key Source: ${keySource}`);
    
    if (apiKey && apiKey.startsWith('sk_live_')) {
        const isVercelProduction = process.env.VERCEL_ENV === 'production';
        const isNonProduction = !isVercelProduction;
        const allowOverride = process.env.ALLOW_NON_PRODUCTION_LIVE_STRIPE === 'true' || process.env.ALLOW_LOCAL_LIVE_STRIPE === 'true';
        
        if (isNonProduction && !allowOverride) {
            console.error(`ERROR: Non-production environment selected a live Stripe key from [${keySource}]. Refusing to run. Use Vercel production route for live testing or set ALLOW_NON_PRODUCTION_LIVE_STRIPE=true intentionally.`);
            process.exit(1);
        }
    }
    
    if (!apiKey) {
        console.error("ERROR: No Stripe API key found.");
        process.exit(1);
    }
    
    try {
        const stripe = new Stripe(apiKey, { apiVersion: '2023-10-16' });
        await stripe.balance.retrieve();
        console.log(`4. Key Validity: VALID (...${apiKey.slice(-4)})`);
    } catch (err: any) {
        console.error(`4. Key Validity: INVALID (...${apiKey.slice(-4)}) - ${err.message}`);
        process.exit(1);
    }
    
    console.log("Preflight passed.");
}
run().catch(console.error).finally(() => prisma.$disconnect());
