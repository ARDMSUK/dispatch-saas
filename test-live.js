const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  // Capture logs
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.toString()));
  page.on('requestfailed', request => {
      console.log(`REQUEST FAILED: ${request.url()} - ${request.failure()?.errorText}`);
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
    
    // Check if there are tickets
    const tickets = await page.$$('a[href^="/dashboard/support/"]:not([href="/dashboard/support/new"])');
    if (tickets.length === 0) {
        console.log("No tickets found. Creating a new one...");
        await page.goto('https://app.cabai.co.uk/dashboard/support/new', { waitUntil: 'networkidle2' });
        await page.type('input[name="subject"]', 'Test Ticket Issue');
        await page.type('textarea[name="message"]', 'This is a test message to see why the AI is frozen.');
        await Promise.all([
            page.waitForNavigation({ waitUntil: 'networkidle2' }),
            page.click('button[type="submit"]')
        ]);
        console.log("Created ticket. URL:", page.url());
    } else {
        console.log("Found existing tickets. Opening the first one...");
        const ticketUrl = await page.evaluate(el => el.href, tickets[0]);
        console.log("Ticket URL:", ticketUrl);
        await page.goto(ticketUrl, { waitUntil: 'networkidle2' });
    }

    console.log("Waiting for chat to load...");
    await new Promise(r => setTimeout(r, 5000)); // Wait to see if it polls or triggers AI

    // Take a screenshot
    await page.screenshot({ path: '/Users/ar/.gemini/antigravity/brain/b8cdf822-3cff-415d-9d77-a2d0c6df7782/artifacts/screenshot.png' });
    console.log("Screenshot saved.");

    // Check if input is disabled
    const isInputDisabled = await page.$eval('input', el => el.disabled);
    console.log("Is input disabled?", isInputDisabled);
    
    if (!isInputDisabled) {
        console.log("Sending a test message...");
        await page.type('input', 'Hello, AI. Are you there?');
        await page.click('form button[type="submit"]');
        await new Promise(r => setTimeout(r, 5000));
        await page.screenshot({ path: '/Users/ar/.gemini/antigravity/brain/b8cdf822-3cff-415d-9d77-a2d0c6df7782/artifacts/screenshot_after_send.png' });
    }

  } catch (err) {
    console.error("Test script failed:", err);
  } finally {
    await browser.close();
  }
})();
