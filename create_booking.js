const puppeteer = require('puppeteer');
const wait = (ms) => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  
  await page.goto('https://app.cabai.co.uk/booker/bourneend', { waitUntil: 'networkidle2' });
  console.log("Loaded web booker");

  await page.type('input[placeholder="Pickup location"]', '53 The Green, Wooburn Green, High Wycombe, UK');
  await wait(1000);
  await page.keyboard.press('Enter');
  await wait(1000);

  // Focus out or click away
  await page.click('body');

  await page.type('input[placeholder="Where to?"]', '14 The Parade, Wooburn Green, Bourne End, UK');
  await wait(1000);
  await page.keyboard.press('Enter');
  await wait(1000);
  await page.click('body');

  // Select pickup time (today, a bit later)
  const timeInput = await page.$('input[type="datetime-local"]');
  if (timeInput) {
      const d = new Date(Date.now() + 3600000);
      const m = (d.getMonth() + 1).toString().padStart(2, '0');
      const day = d.getDate().toString().padStart(2, '0');
      const y = d.getFullYear();
      const h = d.getHours().toString().padStart(2, '0');
      const min = d.getMinutes().toString().padStart(2, '0');
      
      await page.type('input[type="datetime-local"]', `${m}${day}${y}\t${h}${min}`);
  }

  // Calculate Quote
  const quoteBtns = await page.$$('::-p-xpath(//button[contains(., "Calculate Quote")])');
  if (quoteBtns.length > 0) {
      await quoteBtns[0].click();
      console.log("Clicked Calculate Quote");
  } else {
      console.log("Calculate Quote button not found");
  }

  await wait(5000);

  // Fill details
  await page.type('input[name="passengerName"]', 'TEST 20F WEB CASH 2');
  await page.type('input[name="passengerEmail"]', 'ar.uk@me.com');
  await page.type('input[name="passengerPhone"]', '07970586381');
  
  // Click Continue to Payment
  const continueBtns = await page.$$('::-p-xpath(//button[contains(., "Continue to Payment")])');
  if (continueBtns.length > 0) {
      await continueBtns[0].click();
      console.log("Clicked Continue to Payment");
  }

  await wait(3000);

  // Select CASH
  const cashBtns = await page.$$('::-p-xpath(//button[contains(., "Pay with Cash")])');
  if (cashBtns.length > 0) {
      await cashBtns[0].click();
      console.log("Clicked Pay with Cash");
  } else {
      console.log("Pay with Cash button not found");
  }

  await wait(10000);

  console.log("Finished puppeteer script.");
  await browser.close();
})();
