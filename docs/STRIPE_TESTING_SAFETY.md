# Stripe Testing Safety Policy

**CRITICAL RULE:** Never diagnose production Stripe issues from local `.env` alone. Local environments must be safely isolated from live Stripe accounts.

1. Live Stripe keys are blocked by default in local and Vercel preview environments.
2. Live Stripe keys should only run automatically in Vercel production.
3. Vercel preview must not run live Stripe payments or refunds.
4. Local scripts must not use live tenant DB Stripe keys.
5. If a non-production live-key diagnostic is ever needed, it requires explicit override: `ALLOW_NON_PRODUCTION_LIVE_STRIPE=true`.
6. Live payment and refund tests must use `https://app.cabai.co.uk` production routes, not local scripts.
7. Local environments must use `sk_test_...` keys only. Do not copy live production `sk_live_...` keys into `.env` or `.env.local`.
8. Never print full Stripe secret keys in logs, terminal outputs, or Slack. Always mask all but the last 4 characters.
9. Before any live payment or refund test script is executed, a preflight must be run to report the masked key source, environment, and target tenant (e.g., using `scripts/stripe_preflight.ts`).
10. Do not update Vercel environment variables without explicit authorization and approval.
11. Do not update tenant DB Stripe keys without explicit approval.
12. Do not mock Stripe client methods to fake a successful live payment or refund for final production verification. Verification requires the real Stripe API.

If running Stripe locally or in preview, the `validateStripeKeySafety` utility inside `src/lib/stripe.ts` will strictly block you from using an `sk_live_...` key unless `ALLOW_NON_PRODUCTION_LIVE_STRIPE=true` is explicitly set in your environment.
