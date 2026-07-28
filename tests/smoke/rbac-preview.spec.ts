import { test, expect, request, Page } from '@playwright/test';
import * as dotenv from 'dotenv';

// Load local environment variables
dotenv.config({ path: '.env.smoke' });

const BASE_URL = process.env.SMOKE_BASE_URL;
const TENANT_ADMIN_EMAIL = process.env.SMOKE_TENANT_ADMIN_EMAIL;
const TENANT_ADMIN_PASSWORD = process.env.SMOKE_TENANT_ADMIN_PASSWORD;
const DISPATCHER_EMAIL = process.env.SMOKE_DISPATCHER_EMAIL;
const DISPATCHER_PASSWORD = process.env.SMOKE_DISPATCHER_PASSWORD;
const B2B_ADMIN_EMAIL = process.env.SMOKE_B2B_ADMIN_EMAIL;
const B2B_ADMIN_PASSWORD = process.env.SMOKE_B2B_ADMIN_PASSWORD;
const DRIVER_JWT = process.env.SMOKE_DRIVER_JWT;
const TENANT_SLUG = process.env.SMOKE_TENANT_SLUG || 'bourneend';

// Configure test behavior
test.use({
  baseURL: BASE_URL,
  ignoreHTTPSErrors: true,
  actionTimeout: 10000,
});

test.beforeAll(() => {
  if (!BASE_URL) {
    throw new Error('SMOKE_BASE_URL is not defined. Cannot run smoke tests.');
  }
});

/**
 * Helper to log into the application using the UI
 */
async function login(page: Page, email?: string, password?: string) {
  if (!email || !password) {
    test.skip();
  }
  await page.goto('/login');
  await page.fill('input[name="email"]', email!);
  await page.fill('input[name="password"]', password!);
  await page.click('button[type="submit"]');
  // Wait for navigation indicating successful login or clear failure
  await page.waitForURL('**/dashboard**');
}

test.describe('Automated RBAC Smoke Tests', () => {

  // --- TENANT_ADMIN Tests ---
  test('1. TENANT_ADMIN can access settings', async ({ page }) => {
    test.skip(!TENANT_ADMIN_EMAIL || !TENANT_ADMIN_PASSWORD, 'Missing Tenant Admin credentials');
    await login(page, TENANT_ADMIN_EMAIL, TENANT_ADMIN_PASSWORD);
    
    const response = await page.goto('/dashboard/settings');
    expect(response?.status()).toBe(200);
    // Alternatively, verify UI presence of Settings text
    await expect(page.locator('body')).toContainText(/Settings|Company/i);
  });

  test('7. TENANT_ADMIN cannot access /admin/tenants', async ({ page }) => {
    test.skip(!TENANT_ADMIN_EMAIL || !TENANT_ADMIN_PASSWORD, 'Missing Tenant Admin credentials');
    await login(page, TENANT_ADMIN_EMAIL, TENANT_ADMIN_PASSWORD);
    
    const response = await page.goto('/admin/tenants');
    // Should be 403 or UI Access Denied
    if (response?.status() === 200) {
      await expect(page.locator('body')).toContainText(/Access Denied|403|Unauthorized/i);
    } else {
      expect(response?.status()).toBe(403);
    }
  });

  // --- DISPATCHER Tests ---
  test('2. DISPATCHER cannot access settings', async ({ page }) => {
    test.skip(!DISPATCHER_EMAIL || !DISPATCHER_PASSWORD, 'Missing Dispatcher credentials');
    await login(page, DISPATCHER_EMAIL, DISPATCHER_PASSWORD);
    
    const response = await page.goto('/dashboard/settings');
    if (response?.status() === 200) {
      await expect(page.locator('body')).toContainText(/Access Denied|403|Unauthorized/i);
    } else {
      expect(response?.status()).toBe(403);
    }
  });

  test('3. DISPATCHER can access dashboard bookings/map', async ({ page }) => {
    test.skip(!DISPATCHER_EMAIL || !DISPATCHER_PASSWORD, 'Missing Dispatcher credentials');
    await login(page, DISPATCHER_EMAIL, DISPATCHER_PASSWORD);
    
    const response = await page.goto('/dashboard/bookings');
    expect(response?.status()).toBe(200);
  });

  // --- B2B_ADMIN Tests ---
  test('4. B2B_ADMIN cannot access /api/jobs', async ({ page, request }) => {
    test.skip(!B2B_ADMIN_EMAIL || !B2B_ADMIN_PASSWORD, 'Missing B2B Admin credentials');
    await login(page, B2B_ADMIN_EMAIL, B2B_ADMIN_PASSWORD);
    
    // We can fetch via API context since session cookie is now set
    const response = await request.get('/api/jobs');
    expect(response.status()).toBe(403);
  });

  test('5. B2B_ADMIN cannot access /api/dispatch/heatmap', async ({ page, request }) => {
    test.skip(!B2B_ADMIN_EMAIL || !B2B_ADMIN_PASSWORD, 'Missing B2B Admin credentials');
    await login(page, B2B_ADMIN_EMAIL, B2B_ADMIN_PASSWORD);
    
    const response = await request.get('/api/dispatch/heatmap');
    expect(response.status()).toBe(403);
  });

  test('6. B2B_ADMIN can access /b2b/bookings', async ({ page }) => {
    test.skip(!B2B_ADMIN_EMAIL || !B2B_ADMIN_PASSWORD, 'Missing B2B Admin credentials');
    await login(page, B2B_ADMIN_EMAIL, B2B_ADMIN_PASSWORD);
    
    const response = await page.goto('/b2b/bookings');
    expect(response?.status()).toBe(200);
  });

  // --- PUBLIC AND SYSTEM Tests ---
  test('8. Unsigned POST to /api/stripe/webhook returns 400', async ({ request }) => {
    const response = await request.post('/api/stripe/webhook', {
      data: {}
    });
    // Ensure it fails due to signature/secret missing (400), not RBAC Auth (401/403)
    expect(response.status()).toBe(400);
  });

  test('9. Public booker route loads', async ({ page }) => {
    const response = await page.goto(`/booker/${TENANT_SLUG}`);
    expect(response?.status()).toBe(200);
  });

  test('10. Public booker quote endpoint tested directly', async ({ request }) => {
    // We send a direct POST to bypass the Google Maps UI issues.
    // Ensure this body mimics a real quote request but fails gracefully or returns a valid calculated quote.
    const response = await request.post(`/api/booker/${TENANT_SLUG}/quote`, {
      data: {
        pickup: { address: 'London', lat: 51.5, lng: -0.1 },
        dropoff: { address: 'Heathrow', lat: 51.47, lng: -0.45 },
        passengers: 1
      }
    });
    // Verify it doesn't fail with 401/403 or hang.
    // It might return 400 if validation is strict, but that proves the endpoint is reachable.
    expect([200, 400]).toContain(response.status());
  });

  test('11. Driver JWT cannot access /api/jobs', async ({ request }) => {
    if (!DRIVER_JWT) {
      test.skip();
    }
    const response = await request.get('/api/jobs', {
      headers: {
        Authorization: `Bearer ${DRIVER_JWT}`
      }
    });
    expect([401, 403]).toContain(response.status());
  });

});
