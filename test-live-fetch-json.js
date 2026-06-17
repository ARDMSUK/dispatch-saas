const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  
  try {
    console.log("Navigating to login...");
    await page.goto('https://app.cabai.co.uk/login', { waitUntil: 'networkidle2' });
    await page.type('input[name="email"]', 'hello@cabai.co.uk');
    await page.type('input[name="password"]', 'Greenstar520!');
    await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle2' }),
        page.click('button[type="submit"]')
    ]);
    
    console.log("Navigating to dashboard support new...");
    await page.goto('https://app.cabai.co.uk/dashboard/support/new', { waitUntil: 'networkidle2' });
    
    console.log("Creating new ticket...");
    await page.waitForSelector('input[placeholder*="Stripe"]');
    await page.type('input[placeholder*="Stripe"]', 'Fetch JSON test');
    await page.type('textarea', 'Can you please verify the chat system is now completely functional?');
    
    await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle2' }),
        page.click('button[type="submit"]')
    ]);
    
    console.log("Ticket created, URL:", page.url());
    const ticketId = page.url().split('/').pop();

    console.log("Running fetch manually to capture 500 JSON response body...");
    const errorBody = await page.evaluate(async (tid) => {
        const res = await fetch(`/api/support/tickets/${tid}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages: [{ role: 'user', content: 'hello' }] })
        });
        return await res.text();
    }, ticketId);
    
    console.log("500 ERROR BODY FROM SERVER:", errorBody);

  } catch (err) {
    console.error("Test script failed:", err);
  } finally {
    await browser.close();
  }
})();
