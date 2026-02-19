import Stripe from 'stripe';

// Multi-tenant Stripe instance
export const getStripe = (apiKey: string) => {
    return new Stripe(apiKey, {
        typescript: true,
    });
};

// Fallback for system-level operations (if needed, but prefer explicit keys)
export const systemStripe = process.env.STRIPE_SECRET_KEY
    ? new Stripe(process.env.STRIPE_SECRET_KEY, { typescript: true })
    : null;
