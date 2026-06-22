export const reportStripeKeySource = (
    routeName: string,
    keySource: 'Tenant DB' | 'Vercel Env' | 'Local Env' | 'Fallback',
    apiKey: string | null | undefined,
    tenantInfo?: { id: string; name: string }
) => {
    const environment = process.env.VERCEL_ENV
        ? process.env.VERCEL_ENV === 'production'
            ? 'Vercel production'
            : 'Vercel preview'
        : 'Local';

    let keyMode = 'missing';
    let maskedKey = 'none';

    if (apiKey) {
        if (apiKey.startsWith('sk_live_')) keyMode = 'sk_live';
        else if (apiKey.startsWith('sk_test_')) keyMode = 'sk_test';
        else keyMode = 'unknown';

        maskedKey = `...${apiKey.slice(-4)}`;
    }

    console.log(`[Stripe Safety] Route: ${routeName}`);
    console.log(`[Stripe Safety] Environment: ${environment}`);
    console.log(`[Stripe Safety] Key Source: ${keySource}`);
    console.log(`[Stripe Safety] Key Mode: ${keyMode}`);
    console.log(`[Stripe Safety] Masked Key: ${maskedKey}`);
    
    if (tenantInfo) {
        console.log(`[Stripe Safety] Tenant: ${tenantInfo.name} (${tenantInfo.id})`);
    }
};
