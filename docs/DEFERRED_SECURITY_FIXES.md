# Deferred Security Fixes

## 1. Deferred Passenger Auth + Mobile App Compatibility Phase

**Reason deferred:**
The JWT backend security change is the correct direction, but it must not be deployed until the TestFlight/passenger app is updated to store and send:
`Authorization: Bearer <token>`

**Deferred backend files:**
* `src/app/api/booker/[slug]/auth/update-profile/route.ts`
* `src/app/api/booker/[slug]/auth/verify-otp/route.ts`
* `src/app/api/booker/[slug]/stripe/payment-methods/route.ts`
* `src/app/api/booker/[slug]/stripe/setup-intent/route.ts`

**Required mobile app work:**
* store token returned by OTP verification
* send token in Authorization header for profile update
* send token in Authorization header for payment methods
* send token in Authorization header for setup-intent
* clear token on logout
* handle expired/invalid token by returning passenger to OTP login
* test against production API before backend JWT enforcement is deployed

Do not enable these backend JWT changes until the passenger app update is ready.

## 2. Deferred Tracking Token Phase

**Reason deferred:**
Current tracking route uses guessable integer job IDs:
`src/app/api/booker/[slug]/track/[id]/route.ts`

**Risk:**
Medium risk because tracking route exposes pickup/dropoff coordinates, driver name, driver location, vehicle class, price, and job status through a guessable ID.

**Required future work:**
* add unguessable tracking token, preferably UUID
* backfill existing jobs
* update SMS tracking links
* update web booker confirmation/success pages
* update passenger app tracking links if used
* decide whether old integer tracking links redirect or are disabled
* deploy as its own separate phase because it may require schema changes
