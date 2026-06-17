const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  page.on('request', request => {
    if (request.url().includes('/api/support/tickets/')) {
        console.log('>>', request.method(), request.url());
        if (request.method() === 'POST') {
            console.log('POST Data:', request.postData());
        }
    }
  });

  page.on('response', async response => {
    if (response.url().includes('/api/support/tickets/')) {
        console.log('<<', response.status(), response.url());
        try {
            const text = await response.text();
            console.log('Response Body:', text.substring(0, 200));
        } catch (e) {
            console.log('Could not read response body');
        }
    }
  });

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
    await page.type('input[placeholder*="Stripe"]', 'Network interception test');
    await page.type('textarea', 'Can you please verify the chat system?');
    
    await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle2' }),
        page.click('button[type="submit"]')
    ]);
    
    const ticketId = page.url().split('/').pop();
    console.log("Ticket created:", ticketId);

    console.log("Waiting 10 seconds for AI response and logging requests...");
    await new Promise(r => setTimeout(r, 10000));
    
  } catch (err) {
    console.error("Test script failed:", err);
  } finally {
    await browser.close();
  }
})();
