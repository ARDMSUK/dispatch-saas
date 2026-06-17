const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.error('PAGE ERROR:', err));

  try {
    await page.goto('https://app.cabai.co.uk/login', { waitUntil: 'networkidle2' });
    await page.type('input[name="email"]', 'hello@cabai.co.uk');
    await page.type('input[name="password"]', 'Greenstar520!');
    await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle2' }),
        page.click('button[type="submit"]')
    ]);
    
    await page.goto('https://app.cabai.co.uk/dashboard/support/new', { waitUntil: 'networkidle2' });
    await page.type('input[placeholder*="Stripe"]', 'Console log test');
    await page.type('textarea', 'Can you please verify the chat system?');
    
    await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle2' }),
        page.click('button[type="submit"]')
    ]);
    
    const ticketId = page.url().split('/').pop();
    console.log("Ticket created:", ticketId);

    console.log("Waiting 5 seconds...");
    await new Promise(r => setTimeout(r, 5000));
    
  } catch (err) {
    console.error("Test script failed:", err);
  } finally {
    await browser.close();
  }
})();
