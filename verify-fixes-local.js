const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  console.log('Starting local verification...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

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
    // 1. Login locally
    console.log('Logging in to local server...');
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
    await page.fill('input[name="email"]', 'hello@cabai.co.uk');
    await page.fill('input[type="password"]', 'Greenstar520!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 45000 });
    console.log('Logged in to local server successfully.');

    // 2. Test Audit Logs page
    console.log('Navigating to Audit Logs dashboard...');
    await page.goto('http://localhost:3000/dashboard/logs', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    
    const bodyText = await page.evaluate(() => document.body.innerText);
    const hasLogsError = bodyText.includes('Internal Server Error') || logs.some(l => l.includes('500') && l.includes('/api/logs'));
    console.log('Audit logs loaded successfully (no 500 error):', !hasLogsError);
    if (hasLogsError) {
      console.error('Audit Logs check FAILED.');
    }

    // 3. Test Settings Connect SumUp
    console.log('Navigating to Settings...');
    await page.goto('http://localhost:3000/dashboard/settings', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    console.log('Clicking Connect SumUp...');
    await page.click('button:has-text("SumUp"), a:has-text("SumUp")');
    await page.waitForTimeout(3000);
    
    const sumupUrl = page.url();
    console.log('URL after clicking SumUp:', sumupUrl);
    // It should redirect to http://localhost:3000/dashboard/settings?success=sumup_connected
    const isSumupSuccessful = sumupUrl.includes('success=sumup_connected') || sumupUrl.includes('http://localhost:3000/api/integrations/sumup/callback');
    console.log('SumUp redirection check passed (redirected to localhost):', isSumupSuccessful);

    // 4. Test Settings Connect Zettle
    console.log('Navigating back to Settings...');
    await page.goto('http://localhost:3000/dashboard/settings', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    console.log('Clicking Connect Zettle...');
    await page.click('button:has-text("Zettle"), a:has-text("Zettle")');
    await page.waitForTimeout(3000);
    
    const zettleUrl = page.url();
    console.log('URL after clicking Zettle:', zettleUrl);
    const isZettleSuccessful = zettleUrl.includes('success=zettle_connected') || zettleUrl.includes('http://localhost:3000/api/integrations/zettle/callback');
    console.log('Zettle redirection check passed (redirected to localhost):', isZettleSuccessful);

    if (!hasLogsError && isSumupSuccessful && isZettleSuccessful) {
      console.log('LOCAL VERIFICATION PASSED SUCCESSFULLY.');
      fs.writeFileSync('/Users/ar/.gemini/antigravity/brain/b8cdf822-3cff-415d-9d77-a2d0c6df7782/local_verification_status.json', JSON.stringify({ status: 'passed' }));
    } else {
      console.error('LOCAL VERIFICATION FAILED.');
      fs.writeFileSync('/Users/ar/.gemini/antigravity/brain/b8cdf822-3cff-415d-9d77-a2d0c6df7782/local_verification_status.json', JSON.stringify({ status: 'failed', logs }));
    }

  } catch (err) {
    console.error('Error during local verification:', err);
    console.error('Captured logs:', logs);
    try {
      await page.screenshot({ path: '/Users/ar/.gemini/antigravity/brain/b8cdf822-3cff-415d-9d77-a2d0c6df7782/local-verify-error.png', fullPage: true });
      console.log('Saved error screenshot to local-verify-error.png');
    } catch (sErr) {
      console.error('Failed to take screenshot:', sErr);
    }
  } finally {
    await browser.close();
  }
})();
