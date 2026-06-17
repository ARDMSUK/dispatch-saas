const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('response', response => {
      if(response.url().includes('/chat')) console.log(`RESPONSE: ${response.url()} - ${response.status()}`);
  });
  page.on('request', request => {
      if(request.url().includes('/chat')) console.log(`REQUEST: ${request.method()} ${request.url()}`);
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
    await page.type('input[name="subject"]', 'Test Ticket Issue 3');
    await page.type('textarea[name="message"]', 'Checking button state.');
    await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle2' }),
        page.click('button[type="submit"]')
    ]);
    
    console.log("Ticket created:", page.url());
    
    await new Promise(r => setTimeout(r, 2000));
    
    const inputVal = await page.$eval('input', el => el.value);
    const inputDisabled = await page.$eval('input', el => el.disabled);
    const buttonDisabled = await page.$eval('form button[type="submit"]', el => el.disabled);
    console.log(`State before typing -> Input: "${inputVal}", InputDisabled: ${inputDisabled}, ButtonDisabled: ${buttonDisabled}`);
    
    await page.type('input', 'Hello again');
    await new Promise(r => setTimeout(r, 500));
    
    const inputVal2 = await page.$eval('input', el => el.value);
    const buttonDisabled2 = await page.$eval('form button[type="submit"]', el => el.disabled);
    console.log(`State after typing -> Input: "${inputVal2}", ButtonDisabled: ${buttonDisabled2}`);

    await page.click('form button[type="submit"]');
    await new Promise(r => setTimeout(r, 2000));

    const buttonDisabled3 = await page.$eval('form button[type="submit"]', el => el.disabled);
    console.log(`State after clicking -> ButtonDisabled: ${buttonDisabled3}`);

  } catch (err) {
    console.error("Test script failed:", err);
  } finally {
    await browser.close();
  }
})();
