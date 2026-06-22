import Stripe from 'stripe';

const validateStripeKeySafety = (apiKey: string) => {
    const isVercelProduction = process.env.VERCEL_ENV === 'production';
    const isNonProduction = !isVercelProduction;
    
    if (isNonProduction && apiKey?.startsWith('sk_live_')) {
        const allowOverride = process.env.ALLOW_NON_PRODUCTION_LIVE_STRIPE === 'true' || process.env.ALLOW_LOCAL_LIVE_STRIPE === 'true';
        if (!allowOverride) {
            throw new Error('Non-production environment is using a live Stripe key. Refusing to run Stripe locally or in preview. Use Vercel production routes for live testing or set ALLOW_NON_PRODUCTION_LIVE_STRIPE=true intentionally.');
        }
    }
};

// Multi-tenant Stripe instance
export const getStripe = (apiKey: string) => {
    validateStripeKeySafety(apiKey);
    return new Stripe(apiKey, {
        typescript: true,
    });
};

const getSystemStripe = () => {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) return null;
    validateStripeKeySafety(key);
    return new Stripe(key, { typescript: true });
};

// Fallback for system-level operations (if needed, but prefer explicit keys)
export const systemStripe = getSystemStripe();
