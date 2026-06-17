const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
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
    
    console.log("Navigated to dashboard. Getting cookies...");
    const cookies = await page.cookies();
    const cookieString = cookies.map(c => `${c.name}=${c.value}`).join('; ');
    
    console.log("Making fetch request to chat API...");
    const fetchRes = await fetch('https://app.cabai.co.uk/api/support/tickets/cmqhg9kt200013vq6wd0g1pzv/chat', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Cookie': cookieString
        },
        body: JSON.stringify({
            messages: [{ role: 'user', content: 'Test message' }]
        })
    });
    
    console.log(`Status: ${fetchRes.status}`);
    const text = await fetchRes.text();
    console.log(`Response text: ${text}`);

  } catch (err) {
    console.error("Test script failed:", err);
  } finally {
    await browser.close();
  }
})();
