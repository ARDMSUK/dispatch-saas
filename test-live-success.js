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
    await page.type('input[placeholder*="Stripe"]', 'Final Verification Ticket');
    await page.type('textarea', 'Can you please verify the chat system is now completely functional?');
    
    await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle2' }),
        page.click('button[type="submit"]')
    ]);
    
    console.log("Ticket created, URL:", page.url());
    
    console.log("Waiting 8 seconds for AI response and polling...");
    await new Promise(r => setTimeout(r, 8000));
    
    await page.screenshot({ path: '/Users/ar/.gemini/antigravity/brain/b8cdf822-3cff-415d-9d77-a2d0c6df7782/artifacts/screenshot_live_final_1.png' });
    console.log("Took screenshot of AI response.");

    console.log("Typing reply 'Thank you, it works perfectly now!'...");
    await page.type('input[placeholder*="Ask CABAI"]', 'Thank you, it works perfectly now!');
    
    await page.screenshot({ path: '/Users/ar/.gemini/antigravity/brain/b8cdf822-3cff-415d-9d77-a2d0c6df7782/artifacts/screenshot_live_final_2.png' });
    
    console.log("Clicking send...");
    await page.click('button[type="submit"]');
    
    console.log("Waiting 8 seconds for second AI response...");
    await new Promise(r => setTimeout(r, 8000));
    
    await page.screenshot({ path: '/Users/ar/.gemini/antigravity/brain/b8cdf822-3cff-415d-9d77-a2d0c6df7782/artifacts/screenshot_live_final_3.png' });
    console.log("Test finished successfully.");

  } catch (err) {
    console.error("Test script failed:", err);
  } finally {
    await browser.close();
  }
})();
