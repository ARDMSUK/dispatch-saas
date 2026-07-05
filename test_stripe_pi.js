const Stripe = require('stripe');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_51P0... or fallback');

async function main() {
  const tenantSecret = '...'; // I don't know the tenant secret key from memory, I can query it.
}
