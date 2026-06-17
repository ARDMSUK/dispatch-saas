const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    await page.goto('https://app.cabai.co.uk/login', { waitUntil: 'networkidle2' });
    await page.type('input[name="email"]', 'hello@cabai.co.uk');
    await page.type('input[name="password"]', 'Greenstar520!');
    await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle2' }),
        page.click('button[type="submit"]')
    ]);
    
    await page.goto('https://app.cabai.co.uk/dashboard/support/new', { waitUntil: 'networkidle2' });
    await page.waitForSelector('input[placeholder*="Stripe"]');
    await page.type('input[placeholder*="Stripe"]', 'Fetch GET test');
    await page.type('textarea', 'Can you please verify the GET endpoint?');
    
    await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle2' }),
        page.click('button[type="submit"]')
    ]);
    
    const ticketId = page.url().split('/').pop();
    console.log("Ticket created:", ticketId);

    const errorBody = await page.evaluate(async (tid) => {
        const res = await fetch(`/api/support/tickets/${tid}`);
        return await res.text();
    }, ticketId);
    
    console.log("GET RESPONSE BODY:", errorBody);

  } catch (err) {
    console.error("Test script failed:", err);
  } finally {
    await browser.close();
  }
})();
