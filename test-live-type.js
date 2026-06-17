const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('request', req => {
    if (req.url().includes('/api/support/tickets/')) console.log('REQ:', req.method(), req.url());
  });

  try {
    await page.goto('https://app.cabai.co.uk/login', { waitUntil: 'networkidle2' });
    await page.type('input[name="email"]', 'hello@cabai.co.uk');
    await page.type('input[name="password"]', 'Greenstar520!');
    await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle2' }),
        page.click('button[type="submit"]')
    ]);
    
    await page.goto('https://app.cabai.co.uk/dashboard/support/cmqhhogg600016iehhsx4pbqt', { waitUntil: 'networkidle2' });
    
    // Wait for the UI to be ready
    await new Promise(r => setTimeout(r, 2000));
    
    console.log("Typing 'hello'...");
    await page.type('input[placeholder*="Ask CABAI"]', 'hello');
    
    console.log("Clicking send...");
    await page.click('button[type="submit"]');

    console.log("Waiting 5 seconds to see network...");
    await new Promise(r => setTimeout(r, 5000));

  } catch (err) {
    console.error("Test script failed:", err);
  } finally {
    await browser.close();
  }
})();
