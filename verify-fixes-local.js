const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  console.log('Starting local verification...');
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
    // 1. Login locally
    console.log('Logging in to local server (http://localhost:3000)...');
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
    await page.fill('input[name="email"]', 'hello@cabai.co.uk');
    await page.fill('input[type="password"]', 'Greenstar520!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 45000 });
    console.log('Logged in to local server successfully.');
    await page.screenshot({ path: path.join(screenshotDir, 'local_01_dashboard.png') });

    // 2. Navigate to Settings
    console.log('Navigating to Settings page...');
    await page.goto('http://localhost:3000/dashboard/settings', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(screenshotDir, 'local_02_settings.png') });

    // 3. Test Dropdown legibility (take screenshot of Workspace preference dropdown)
    console.log('Opening layout dropdown...');
    await page.click('button:has-text("Modern Layout"), button:has-text("Classic Layout")');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(screenshotDir, 'local_03_layout_dropdown.png') });
    console.log('Dropdown screenshot captured.');

    // Close dropdown
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    // 4. Fill SumUp & Zettle Credentials
    console.log('Filling SumUp and Zettle credentials...');
    await page.fill('input[placeholder="e.g. client-id-..."] >> nth=0', 'mock-sumup-client-id');
    await page.fill('input[placeholder="e.g. client-secret-..."] >> nth=0', 'mock-sumup-client-secret');
    await page.fill('input[placeholder="e.g. client-id-..."] >> nth=1', 'mock-zettle-client-id');
    await page.fill('input[placeholder="e.g. client-secret-..."] >> nth=1', 'mock-zettle-client-secret');
    await page.screenshot({ path: path.join(screenshotDir, 'local_04_credentials_filled.png') });

    // 5. Save settings
    console.log('Saving settings...');
    await page.click('button:has-text("Save Settings")');
    await page.waitForTimeout(3000); // Wait for save operation and toast
    await page.screenshot({ path: path.join(screenshotDir, 'local_05_saved.png') });

    // 6. Reload Settings and verify credentials persisted
    console.log('Reloading Settings page to verify persistence...');
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    const savedSumupId = await page.inputValue('input[placeholder="e.g. client-id-..."] >> nth=0');
    const savedZettleId = await page.inputValue('input[placeholder="e.g. client-id-..."] >> nth=1');
    console.log('Persisted SumUp Client ID:', savedSumupId);
    console.log('Persisted Zettle Client ID:', savedZettleId);

    const isPersistenceSuccessful = savedSumupId === 'mock-sumup-client-id' && savedZettleId === 'mock-zettle-client-id';
    console.log('Credentials persistence verification:', isPersistenceSuccessful ? 'PASSED' : 'FAILED');

    // 7. Test OAuth Redirect with credentials
    console.log('Testing Connect SumUp redirect...');
    await page.click('button:has-text("Connect SumUp")');
    await page.waitForTimeout(4000);
    
    const sumupUrl = page.url();
    console.log('URL after clicking SumUp Connect:', sumupUrl);
    const isSumupSuccessful = sumupUrl.includes('success=sumup_connected');
    console.log('SumUp integration callback success:', isSumupSuccessful);
    await page.screenshot({ path: path.join(screenshotDir, 'local_06_sumup_connected.png') });

    // Disconnect SumUp
    if (isSumupSuccessful) {
        console.log('Disconnecting SumUp...');
        await page.click('button:has-text("Disconnect SumUp")');
        await page.waitForTimeout(2000);
        await page.screenshot({ path: path.join(screenshotDir, 'local_07_sumup_disconnected.png') });
    }

    // Zettle redirect test
    console.log('Testing Connect Zettle redirect...');
    await page.click('button:has-text("Connect Zettle")');
    await page.waitForTimeout(4000);

    const zettleUrl = page.url();
    console.log('URL after clicking Zettle Connect:', zettleUrl);
    const isZettleSuccessful = zettleUrl.includes('success=zettle_connected');
    console.log('Zettle integration callback success:', isZettleSuccessful);
    await page.screenshot({ path: path.join(screenshotDir, 'local_08_zettle_connected.png') });

    // Disconnect Zettle
    if (isZettleSuccessful) {
        console.log('Disconnecting Zettle...');
        await page.click('button:has-text("Disconnect Zettle")');
        await page.waitForTimeout(2000);
        await page.screenshot({ path: path.join(screenshotDir, 'local_09_zettle_disconnected.png') });
    }

    if (isPersistenceSuccessful && isSumupSuccessful && isZettleSuccessful) {
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
      await page.screenshot({ path: path.join(screenshotDir, 'local_error.png'), fullPage: true });
      console.log('Saved error screenshot to local_error.png');
    } catch (sErr) {
      console.error('Failed to take screenshot:', sErr);
    }
  } finally {
    await browser.close();
  }
})();
