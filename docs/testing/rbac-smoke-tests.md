# RBAC & Core Smoke Test Harness

## 1. Purpose
This automated test suite (powered by Playwright) validates the core Role-Based Access Control (RBAC) matrix for the CABAI Dispatch application. It verifies that different user roles (`TENANT_ADMIN`, `DISPATCHER`, `B2B_ADMIN`, `DRIVER`) can only access their permitted routes and APIs. It completely eliminates manual re-testing of the baseline RBAC matrix when making system changes.

## 2. Required env variables
To run these tests, you must provide valid credentials for test accounts representing the different roles.

Create a `.env.smoke` file in the root of the project.

## 3. Example `.env.smoke`
```env
# URL to test against (e.g. Vercel Preview URL or localhost)
SMOKE_BASE_URL=https://dispatch-saas-p1hnj8rgl-ars-projects-21ec212a.vercel.app

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

## 4. How to run against preview
1. Ensure your `.env.smoke` is fully populated.
2. Run the smoke test suite:
   ```bash
   npm run smoke:rbac
   ```

## 5. Safety warnings
- **DO NOT COMMIT `.env.smoke`!** It contains sensitive passwords. Ensure it remains in your `.gitignore`.
- This test suite is designed to run against preview or staging URLs. 
- Do not store smoke-test passwords in Vercel environment variables unless setting up dedicated, isolated CI test accounts.

## 6. What is read-only?
The test suite is strictly **read-only**. It does not:
- Create bookings
- Dispatch jobs
- Trigger live Stripe webhooks
- Modify the database
- Send SMS or emails

The only non-GET request is an empty, unsigned `POST` to `/api/stripe/webhook`, which intentionally fails validation (`400 Bad Request`) to ensure the route isn't blocked by standard session RBAC (`401/403`).

## 7. Skipped tests
If any credentials (like `SMOKE_DRIVER_JWT`) are omitted from `.env.smoke`, the dependent tests will gracefully skip and report as `SKIPPED`.

## 8. How to interpret PASS/FAIL/SKIPPED
The custom test reporter outputs the exact status of each test:
- **PASS**: The RBAC guard functioned perfectly (either correctly allowed or correctly blocked).
- **FAIL**: A route was exposed that should have been blocked, or a valid user was blocked from their permitted route. **If any critical RBAC test fails, "Safe to continue" will be NO.**
- **SKIPPED**: The test did not run due to missing credentials.

## 9. REMINDER
**`.env.smoke` is local-only and must never be committed.**
