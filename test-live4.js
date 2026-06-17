const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.toString()));
  page.on('response', response => {
      console.log(`RESPONSE: ${response.url()} - ${response.status()}`);
  });

  try {
    console.log("Navigating to login...");
    await page.goto('https://app.cabai.co.uk/login', { waitUntil: 'networkidle2' });
    await page.type('input[name="email"]', 'hello@cabai.co.uk');
    await page.type('input[name="password"]', 'Greenstar520!');
    await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle2' }),
        page.click('button[type="submit"]')
    ]);
    
    console.log("Navigated to dashboard. Going to support/new...");
    await page.goto('https://app.cabai.co.uk/dashboard/support/new', { waitUntil: 'networkidle2' });
    
    console.log("Creating new ticket...");
    await page.type('input[name="subject"]', 'Test Ticket 4');
    await page.type('textarea[name="message"]', 'Checking AI response');
    await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle2' }),
        page.click('button[type="submit"]')
    ]);
    
    console.log("Ticket created, URL:", page.url());
    
    await new Promise(r => setTimeout(r, 5000));
    
    await page.screenshot({ path: '/Users/ar/.gemini/antigravity/brain/b8cdf822-3cff-415d-9d77-a2d0c6df7782/artifacts/screenshot_live4_initial.png' });
    console.log("Took initial screenshot.");

    const inputDisabled = await page.$eval('input', el => el.disabled);
    const buttonDisabled = await page.$eval('form button[type="submit"]', el => el.disabled);
    console.log(`Initial state -> InputDisabled: ${inputDisabled}, ButtonDisabled: ${buttonDisabled}`);
    
    console.log("Typing 'Hello again'...");
    await page.type('input', 'Hello again');
    
    const inputVal = await page.$eval('input', el => el.value);
    const buttonDisabled2 = await page.$eval('form button[type="submit"]', el => el.disabled);
    console.log(`State after typing -> Input: "${inputVal}", ButtonDisabled: ${buttonDisabled2}`);

    await page.screenshot({ path: '/Users/ar/.gemini/antigravity/brain/b8cdf822-3cff-415d-9d77-a2d0c6df7782/artifacts/screenshot_live4_typed.png' });

  } catch (err) {
    console.error("Test script failed:", err);
  } finally {
    await browser.close();
  }
})();
