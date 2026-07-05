# Root Cause Analysis & Plan

The root cause of the "Failed to verify payment intent" error has been identified as a **Mismatched Stripe API Key** issue caused by a hardcoded `tenantId` in the frontend and a stale API key in the database.

## What Happened

1. **Payment Intent Creation (`/api/create-payment-intent`)**:
   - The operator console's `booking-form.tsx` has a hardcoded `tenantId: 'demo-taxis'` in the `bookingDetails` passed to the `PaymentModal`.
   - `/api/create-payment-intent` looks up `'demo-taxis'` in the database. It is not found.
   - The route falls back to the system's `process.env.STRIPE_SECRET_KEY` (`sk_live_...brK6E`), which is a valid API key.
   - A valid PaymentIntent (`pi_3TmXhBGAT4mov2QR0cSgIUFC`) is created on the System's Stripe account, and the customer's card is successfully charged £1.

2. **Job Creation & Verification (`/api/jobs`)**:
   - The frontend calls `POST /api/jobs` with the successful `paymentIntentId`.
   - The backend reads the real `tenantId` (`cmotadopt00081184tr3olkzc`) from the operator's JWT token.
   - The backend looks up this tenant in the DB and retrieves their stored `stripeSecretKey` (`sk_live_...itBsvc`).
   - This stored API key is **expired/invalid** in Stripe.
   - When `/api/jobs` calls `stripe.paymentIntents.retrieve()`, Stripe throws an `Expired API Key` error.
   - The backend catches this error and returns `400 Failed to verify payment intent`.
   - The booking fails to save, leaving an orphaned payment on the system Stripe account.

## Reconciling the Orphaned Payment

Since the booking was not saved in the database, there is no job record to update.
The £1 charge resides on the System Stripe account (`sk_live_...brK6E`).

**Recommendation**: We must issue a **Refund** for `pi_3TmXhBGAT4mov2QR0cSgIUFC` because there is no corresponding CabAI job, and manually inserting a job without passenger confirmation/dispatch data is error-prone. Alternatively, the operator can manually create a `CASH` or `ACCOUNT` booking for £1 and we can execute a DB script to map the Stripe `paymentIntentId` to it. Refund is the cleanest path.

## Proposed Fix

1. **Remove Hardcoded `tenantId`**:
   In `src/components/dashboard/booking-form.tsx`, remove `tenantId: 'demo-taxis'` and dynamically pass the correct `tenantId` from the operator's session.

2. **Fix the Tenant's Database Key**:
   If `cmotadopt00081184tr3olkzc` is the master tenant intended to use the System Stripe account, we should execute a Prisma query to set their `stripeSecretKey` to `null`. This will force both `/api/create-payment-intent` and `/api/jobs` to cleanly fall back to the system `process.env.STRIPE_SECRET_KEY`, ensuring they use the identical valid key.
