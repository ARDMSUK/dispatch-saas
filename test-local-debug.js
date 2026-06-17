const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.error('PAGE ERROR:', err));
  
  page.on('request', request => {
    if (request.url().includes('/api/support/tickets/')) {
        console.log('REQ>>', request.method(), request.url());
        if (request.method() === 'POST') {
            console.log('REQ>> POST Data:', request.postData());
        }
    }
  });

  page.on('response', async response => {
    if (response.url().includes('/api/support/tickets/') && response.request().method() === 'POST') {
        console.log('RES<<', response.status(), response.url());
        try {
            const text = await response.text();
            console.log('RES<< Body:', text.substring(0, 300));
        } catch (e) {
            console.log('RES<< Could not read response body');
        }
    }
  });

  try {
    console.log("Navigating to login...");
    await page.goto('http://localhost:3000/login', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForSelector('input[name="email"]', { timeout: 60000 });
    await page.type('input[name="email"]', 'hello@cabai.co.uk');
    await page.type('input[name="password"]', 'Greenstar520!');
    await Promise.all([
        page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 60000 }),
        page.click('button[type="submit"]')
    ]);
    
    console.log("Navigating to new ticket page...");
    await page.goto('http://localhost:3000/dashboard/support/new', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForSelector('input[placeholder*="Stripe"]', { timeout: 60000 });
    await page.type('input[placeholder*="Stripe"]', 'Local Debug test');
    await page.type('textarea', 'Can you please verify the chat system?');
    
    console.log("Submitting new ticket form...");
    await Promise.all([
        page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 60000 }),
        page.click('button[type="submit"]')
    ]);
    
    const ticketId = page.url().split('/').pop();
    console.log("Ticket created:", ticketId);

    console.log("Waiting 5 seconds for UI auto-trigger...");
    await new Promise(r => setTimeout(r, 5000));
    
    const isButtonDisabled = await page.$eval('button[type="submit"]', el => el.disabled);
    console.log("Is button disabled after 5s?", isButtonDisabled);
    
    if (!isButtonDisabled) {
        console.log("Typing 'local test'...");
        await page.type('input[placeholder*="Ask CABAI"]', 'local test');
        await page.click('button[type="submit"]');
        console.log("Waiting 5 seconds for response...");
        await new Promise(r => setTimeout(r, 5000));
    }
    
  } catch (err) {
    console.error("Test script failed:", err);
  } finally {
    await browser.close();
  }
})();
