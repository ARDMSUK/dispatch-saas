# QA Checkpoint: Phases 13 to 15

## 1. Completed Phases

Core live payment and refund flows are now verified for the tested scenarios.

- **Phase 13:** Operator assignment and generic job PATCH security, including authenticated assignment and unassign/cancel route hardening.
- **Phase 14:** Driver workflow lifecycle testing, including EN_ROUTE, ARRIVED, POB, manual CASH payment decoupling, completion, NO_SHOW, driver decline, operator unassign, and operator cancel.
- **Phase 15A/B/C:** Stripe integration, live operator refund route, and environment safety guardrails. Phase 15B fixed refund driver release and generic paid-Stripe cancel guard. Phase 15C verified live Stripe paid assigned-job refund with Job #369.

## 2. Tested Job States and Findings

The following key jobs were tested to verify the lifecycle and payment features:

| Job ID | Description | Final Status | Payment Status | Payment Type | Payment Provider | Driver Final State | Stripe Touched? |
|---|---|---|---|---|---|---|---|
| #353 | Web Booker live card payment and refund | CANCELLED | REFUNDED | CARD | STRIPE | n/a or unchanged | Yes |
| #358 | Cash manual payment and completion | COMPLETED | PAID | CASH | CASH | FREE | No |
| #359 | Driver no-show | NO_SHOW | UNPAID | CASH | null | FREE | No |
| #360 | Driver decline | PENDING | UNPAID | CASH | null | FREE | No |
| #362 | Operator unassign then cancel | CANCELLED | UNPAID | CASH | null | FREE | No |
| #363 | Assigned-job cancel | CANCELLED | UNPAID | CASH | null | FREE | No |
| #369 | Live Stripe paid assigned-job refund | CANCELLED | REFUNDED | CARD | STRIPE | FREE | Yes |

## 3. Payment / Refund Findings

### Payment Webhooks

Payment confirmation paths were validated through live production payment flows. Webhook coverage appears functional but should be documented with exact Stripe event IDs in a later webhook audit.

### Refund Route

The refund route cancelled/refunded Job #369 and released the driver to FREE.

### Generic Cancel Route

Generic cancel was rejected with HTTP 400:

`Cannot cancel a paid Stripe job from this route. Use the dedicated refund route.`

## 4. Commits Involved

- `9153f98` — Stripe environment safety guardrails
- `7e98e3c` — Refund route driver release and paid Stripe generic cancel guard
- `8b12400` — Manual CASH payment route decoupling
- `f2e4670` — Driver status transition security
- `b1bf732` — Generic job PATCH route security

## 5. Stripe Safety Status & Guardrails

The following safety controls are actively enforced:

- **Environment restrictions:** Local and Vercel Preview environments are blocked from silently using `sk_live` keys.
- **Live requirements:** Live Stripe testing must use `https://app.cabai.co.uk`.
- **Key masking:** No full Stripe keys may be printed.
- **Key source auditing:** Tenant DB key source must be masked and confirmed before live payment/refund tests.
- **Production-only live keys:** Live Stripe keys should only run automatically in Vercel production.

## 6. Open Risks and Observations

### Abandoned PaymentIntents — Job #369 Observation

Job #369 had two PaymentIntent references:

- Original Web Booker intent: `pi_3TlDOlGAT4mov2QR1ijPMd9E`
- Successful Checkout payment reference: `pi_3TlDZEGAT4mov2QR1IVKWqD7`

This was acceptable for the refund test because the refund route correctly refunded the paid `paymentReferenceId`.

However, it leaves an open issue: if a user starts one payment flow and later pays using another payment link, the abandoned PaymentIntent may remain incomplete in Stripe.

### Missing Webhook Evidence

While production tests resulted in PAID jobs, we do not yet have exact Stripe Event IDs and Vercel log receipts for the underlying `checkout.session.completed` and `payment_intent.succeeded` webhooks.

This should be handled in a later webhook audit.

## 7. Recommended Next Fixes

Recommended future fixes for duplicate payment generation risk:

- Before creating a new payment link/session, check the current job payment state.
- If the job is already `PAID` or `REFUNDED`, do not create a new payment session.
- If an active Stripe Checkout Session or PaymentIntent already exists for the job, reuse it or explicitly expire/cancel the old one before creating a new one.
- Use Stripe metadata and/or idempotency keys based on the job ID.
- On webhook receipt, if the job is already `PAID`, log the duplicate attempt and do not overwrite the paid reference unless intentionally designed.

## 8. Remaining QA Work

The following areas still need future QA:

- Exact webhook event audit with Stripe event IDs and Vercel logs.
- Duplicate payment prevention and active PaymentIntent/session reuse or expiry.
- Tenant Stripe key revocation handling.
- Refund retry/idempotency for network failures.
- Account/B2B booking flow.
- Invoice/account jobs/statements.
- Flight monitoring.
- Passenger notification coverage for cancellation/no-show/completion SMS.
- Broader tenant isolation audit across all remaining routes.
