const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  console.log('Starting live verification against app.cabai.co.uk...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const screenshotDir = '/Users/ar/.gemini/antigravity/brain/b8cdf822-3cff-415d-9d77-a2d0c6df7782/screenshots';
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }

  const logs = [];
  page.on('console', msg => {
    logs.push(`[CONSOLE ${msg.type().toUpperCase()}]: ${msg.text()}`);
  });

  page.on('response', response => {
    if (response.status() >= 400) {
      logs.push(`[NETWORK ERROR ${response.status()}]: ${response.request().method()} ${response.url()}`);
    }
  });

  try {
    // 1. Login to Live system
    console.log('Logging in to live URL (https://app.cabai.co.uk)...');
    await page.goto('https://app.cabai.co.uk/login', { waitUntil: 'networkidle' });
    await page.fill('input[name="email"]', 'hello@cabai.co.uk');
    await page.fill('input[type="password"]', 'Greenstar520!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 30000 });
    console.log('Logged in to live system successfully.');
    await page.screenshot({ path: path.join(screenshotDir, 'live_01_dashboard.png') });

    // 2. Test Audit Logs page on live system
    console.log('Navigating to Audit Logs dashboard on live...');
    await page.goto('https://app.cabai.co.uk/dashboard/logs', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: path.join(screenshotDir, 'live_02_logs.png') });
    
    const bodyText = await page.evaluate(() => document.body.innerText);
    const hasLogsError = bodyText.includes('Internal Server Error') || logs.some(l => l.includes('500') && l.includes('/api/logs'));
    console.log('Live Audit logs loaded successfully (no 500 error):', !hasLogsError);
    if (hasLogsError) {
      console.error('Live Audit Logs check FAILED.');
    }

    // 3. Test Settings Connect SumUp on live
    console.log('Navigating to Settings on live...');
    await page.goto('https://app.cabai.co.uk/dashboard/settings', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Test layout dropdown options rendering (check background opacity/transparency)
    console.log('Testing layout dropdown contrast/transparency...');
    await page.click('button:has-text("Modern Layout"), button:has-text("Classic Layout"), button:has-text("Select Layout")');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(screenshotDir, 'live_03_settings_layout_dropdown.png') });
    // Press Escape to close the dropdown
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    // Disconnect SumUp first if it is already connected to start from a clean state
    const sumupAlreadyConnected = await page.locator('button', { hasText: /^Disconnect SumUp$/ }).isVisible();
    if (sumupAlreadyConnected) {
      console.log('SumUp is already connected. Disconnecting first to test full flow...');
      await page.locator('button', { hasText: /^Disconnect SumUp$/ }).click();
      await page.waitForTimeout(2000);
    }

    console.log('Clicking Connect SumUp on live...');
    await page.locator('button', { hasText: /^Connect SumUp$/ }).click();
    await page.waitForTimeout(4000);
    
    const sumupUrl = page.url();
    console.log('Live URL after clicking SumUp:', sumupUrl);
    const isSumupSuccessful = sumupUrl.includes('success=sumup_connected');
    console.log('Live SumUp redirection check passed (redirected with success query):', isSumupSuccessful);
    await page.screenshot({ path: path.join(screenshotDir, 'live_04_sumup_redirect.png') });

    // Verify "Connected" badge and disconnect flow
    console.log('Verifying SumUp connection state...');
    const sumupConnected = await page.locator('button', { hasText: /^Disconnect SumUp$/ }).isVisible();
    console.log('SumUp connected:', sumupConnected);
    
    if (sumupConnected) {
      console.log('Clicking Disconnect SumUp...');
      await page.locator('button', { hasText: /^Disconnect SumUp$/ }).click();
      await page.waitForTimeout(2000);
      const sumupDisconnected = await page.locator('button', { hasText: /^Connect SumUp$/ }).isVisible();
      console.log('SumUp disconnect successful:', sumupDisconnected);
      await page.screenshot({ path: path.join(screenshotDir, 'live_04_sumup_disconnected.png') });
    }

    // 4. Test Settings Connect Zettle on live
    const zettleAlreadyConnected = await page.locator('button', { hasText: /^Disconnect Zettle$/ }).isVisible();
    if (zettleAlreadyConnected) {
      console.log('Zettle is already connected. Disconnecting first to test full flow...');
      await page.locator('button', { hasText: /^Disconnect Zettle$/ }).click();
      await page.waitForTimeout(2000);
    }

    console.log('Clicking Connect Zettle on live...');
    await page.locator('button', { hasText: /^Connect Zettle$/ }).click();
    await page.waitForTimeout(4000);
    
    const zettleUrl = page.url();
    console.log('Live URL after clicking Zettle:', zettleUrl);
    const isZettleSuccessful = zettleUrl.includes('success=zettle_connected');
    console.log('Live Zettle redirection check passed (redirected with success query):', isZettleSuccessful);
    await page.screenshot({ path: path.join(screenshotDir, 'live_05_zettle_redirect.png') });

    console.log('Verifying Zettle connection state...');
    const zettleConnected = await page.locator('button', { hasText: /^Disconnect Zettle$/ }).isVisible();
    console.log('Zettle connected:', zettleConnected);
    
    if (zettleConnected) {
      console.log('Clicking Disconnect Zettle...');
      await page.locator('button', { hasText: /^Disconnect Zettle$/ }).click();
      await page.waitForTimeout(2000);
      const zettleDisconnected = await page.locator('button', { hasText: /^Connect Zettle$/ }).isVisible();
      console.log('Zettle disconnect successful:', zettleDisconnected);
      await page.screenshot({ path: path.join(screenshotDir, 'live_05_zettle_disconnected.png') });
    }

    if (!hasLogsError && isSumupSuccessful && isZettleSuccessful && sumupConnected && zettleConnected) {
      console.log('LIVE E2E VERIFICATION PASSED SUCCESSFULLY.');
      fs.writeFileSync('/Users/ar/.gemini/antigravity/brain/b8cdf822-3cff-415d-9d77-a2d0c6df7782/live_verification_status.json', JSON.stringify({ status: 'passed' }));
    } else {
      console.error('LIVE E2E VERIFICATION FAILED.');
      fs.writeFileSync('/Users/ar/.gemini/antigravity/brain/b8cdf822-3cff-415d-9d77-a2d0c6df7782/live_verification_status.json', JSON.stringify({ status: 'failed', logs }));
    }

  } catch (err) {
    console.error('Error during live verification:', err);
    console.error('Captured logs:', logs);
    try {
      await page.screenshot({ path: path.join(screenshotDir, 'live_error.png'), fullPage: true });
      console.log('Saved error screenshot to live_error.png');
    } catch (sErr) {
      console.error('Failed to take screenshot:', sErr);
    }
  } finally {
    await browser.close();
  }
})();
