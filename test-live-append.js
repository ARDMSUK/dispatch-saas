const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));

  try {
    await page.goto('https://app.cabai.co.uk/login', { waitUntil: 'networkidle2' });
    await page.type('input[name="email"]', 'hello@cabai.co.uk');
    await page.type('input[name="password"]', 'Greenstar520!');
    await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle2' }),
        page.click('button[type="submit"]')
    ]);
    
    // We will simulate the append logic in the browser context manually to see if append triggers POST
    await page.goto('https://app.cabai.co.uk/dashboard/support/cmqhhogg600016iehhsx4pbqt', { waitUntil: 'networkidle2' });
    
    // Wait for the UI to be ready
    await new Promise(r => setTimeout(r, 2000));
    
    // If the input is NOT disabled, we can type. If it IS disabled, we can't.
    const isDisabled = await page.$eval('input[placeholder*="Ask CABAI"]', el => el.disabled);
    console.log("Is input disabled?", isDisabled);

  } catch (err) {
    console.error("Test script failed:", err);
  } finally {
    await browser.close();
  }
})();
