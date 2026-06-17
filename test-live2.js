const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  // Capture logs
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.toString()));
  page.on('response', response => {
      console.log(`RESPONSE: ${response.url()} - ${response.status()}`);
  });

  try {
    console.log("Navigating to login...");
    await page.goto('https://app.cabai.co.uk/login', { waitUntil: 'networkidle2' });
    
    console.log("Filling credentials...");
    await page.type('input[name="email"]', 'hello@cabai.co.uk');
    await page.type('input[name="password"]', 'Greenstar520!');
    
    console.log("Clicking login...");
    await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle2' }),
        page.click('button[type="submit"]')
    ]);
    
    console.log("Navigated to dashboard. Going to support page...");
    await page.goto('https://app.cabai.co.uk/dashboard/support', { waitUntil: 'networkidle2' });
    
    const tickets = await page.$$('a[href^="/dashboard/support/"]:not([href="/dashboard/support/new"])');
    if (tickets.length > 0) {
        console.log("Found existing tickets. Opening the first one...");
        const ticketUrl = await page.evaluate(el => el.href, tickets[0]);
        console.log("Ticket URL:", ticketUrl);
        await page.goto(ticketUrl, { waitUntil: 'networkidle2' });
    }

    console.log("Waiting for chat to load...");
    await new Promise(r => setTimeout(r, 5000));

    // Try sending
    console.log("Sending a test message...");
    await page.type('input', 'Hello, AI. Are you there?');
    await page.click('form button[type="submit"]');
    await new Promise(r => setTimeout(r, 5000));

  } catch (err) {
    console.error("Test script failed:", err);
  } finally {
    await browser.close();
  }
})();
