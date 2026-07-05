import { getStripe } from './src/lib/stripe';
async function main() {
  const mask = (s: string | undefined) => s ? `${s.substring(0, 8)}...${s.substring(s.length - 4)}` : null;

  const secret = process.env.STRIPE_SECRET_KEY;
  const pub = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

  console.log("Vercel STRIPE_SECRET_KEY:", mask(secret));
  console.log("Vercel NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:", mask(pub));

  if (!secret) {
    console.log("No system secret key found");
    return;
  }

  const stripe = getStripe(secret);
  try {
    const acc = await stripe.accounts.retrieve();
    console.log("Stripe account ID returned by system key:", acc.id);
    console.log("Is valid:", true);
    // Is this the dashboard account? The user says "is this the Stripe dashboard account the user is currently viewing"
    // I can't know for sure what the user is viewing, but I'll print the account ID.
  } catch (err: any) {
    console.log("Stripe error:", err.message);
    console.log("Is valid:", false);
  }
}

main().catch(console.error);
