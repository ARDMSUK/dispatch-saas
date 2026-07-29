import { test, expect } from '@playwright/test';

test('Password visibility toggle on production', async ({ page }) => {
  await page.goto('https://app.cabai.co.uk/login');
  
  const passwordInput = page.locator('input[name="password"]');
  await expect(passwordInput).toHaveAttribute('type', 'password');
  
  const eyeIcon = page.locator('button', { hasText: 'Show password' }).or(page.locator('button svg.lucide-eye'));
  await eyeIcon.first().click();
  
  await expect(passwordInput).toHaveAttribute('type', 'text');
  
  await eyeIcon.first().click();
  await expect(passwordInput).toHaveAttribute('type', 'password');
  
  console.log('Password toggle UI verified on production login page.');
});
