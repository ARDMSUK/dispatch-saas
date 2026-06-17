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
    
    await page.goto('https://app.cabai.co.uk/dashboard/support/cmqhhogg600016iehhsx4pbqt', { waitUntil: 'networkidle2' });
    
    // Wait for the UI to be ready
    await new Promise(r => setTimeout(r, 2000));
    
    const isButtonDisabled = await page.$eval('button[type="submit"]', el => el.disabled);
    console.log("Is button disabled initially?", isButtonDisabled);

    await page.type('input[placeholder*="Ask CABAI"]', 'hello');

    const isButtonDisabledAfterType = await page.$eval('button[type="submit"]', el => el.disabled);
    console.log("Is button disabled after typing?", isButtonDisabledAfterType);

  } catch (err) {
    console.error("Test script failed:", err);
  } finally {
    await browser.close();
  }
})();
