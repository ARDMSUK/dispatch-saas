# RBAC & Core Smoke Test Harness

## 1. Purpose
This automated test suite (powered by Playwright) validates the core Role-Based Access Control (RBAC) matrix for the CABAI Dispatch application. It verifies that different user roles (`TENANT_ADMIN`, `DISPATCHER`, `B2B_ADMIN`, `DRIVER`) can only access their permitted routes and APIs. It completely eliminates manual re-testing of the baseline RBAC matrix when making system changes.

## 2. Required env variables
You will need a `.env.smoke` file in the root of the project. **This file is gitignored and must never be committed.**

```env
# Required for testing against Vercel Preview Environments
VERCEL_AUTOMATION_BYPASS_SECRET=your_secret_here

SMOKE_BASE_URL=https://dispatch-saas-your-preview-url.vercel.app

# Tenant Admin
SMOKE_TENANT_ADMIN_EMAIL=admin@example.com
SMOKE_TENANT_ADMIN_PASSWORD=your_password

# Dispatcher
SMOKE_DISPATCHER_EMAIL=dispatcher@example.com
SMOKE_DISPATCHER_PASSWORD=your_password

# B2B Admin
SMOKE_B2B_ADMIN_EMAIL=b2b@example.com
SMOKE_B2B_ADMIN_PASSWORD=your_password

# (Optional) Driver
SMOKE_DRIVER_JWT=eyJhb...

# (Optional) Tenant slug for public booker
SMOKE_TENANT_SLUG=bourneend
```

### 2.1 Vercel Automation Bypass Secret
If `SMOKE_BASE_URL` is a Vercel Preview Environment (`vercel.app`), Vercel SSO will intercept all automated requests. You must provide a `VERCEL_AUTOMATION_BYPASS_SECRET`.

1. Go to your Vercel Dashboard -> Project -> **Settings** -> **Deployment Protection** -> **Vercel Authentication**.
2. Scroll to **Protection Bypass for Automation** and copy the **Secret**.
3. Add it to `.env.smoke` as `VERCEL_AUTOMATION_BYPASS_SECRET=`.
4. **DO NOT** share this secret in chat. Normal visitors remain protected by Vercel SSO.

## 3. Running Tests

### 3.1 Diagnostic Check
Before running the full suite, verify your bypass secret works:
```bash
npm run smoke:diagnostic
```

### 3.2 Full Smoke Suite
Run the full RBAC check:
```bash
npm run smoke:rbac
```

## 4. Safety warnings
- **DO NOT COMMIT `.env.smoke`!** It contains sensitive passwords. Ensure it remains in your `.gitignore`.
- This test suite is designed to run against preview or staging URLs. 
- Do not store smoke-test passwords in Vercel environment variables unless setting up dedicated, isolated CI test accounts.

## 5. What is read-only?
The test suite is strictly **read-only**. It does not:
- Create bookings
- Dispatch jobs
- Trigger live Stripe webhooks
- Modify the database
- Send SMS or emails

The only non-GET request is an empty, unsigned `POST` to `/api/stripe/webhook`, which intentionally fails validation (`400 Bad Request`) to ensure the route isn't blocked by standard session RBAC (`401/403`).

## 6. Skipped tests
If any credentials (like `SMOKE_DRIVER_JWT`) are omitted from `.env.smoke`, the dependent tests will gracefully skip and report as `SKIPPED`.

## 7. How to interpret PASS/FAIL/SKIPPED
The custom test reporter outputs the exact status of each test:
- **PASS**: The RBAC guard functioned perfectly (either correctly allowed or correctly blocked).
- **FAIL**: A route was exposed that should have been blocked, or a valid user was blocked from their permitted route. **If any critical RBAC test fails, "Safe to continue" will be NO.**
- **SKIPPED**: The test did not run due to missing credentials.

## 8. REMINDER
**`.env.smoke` is local-only and must never be committed.**
