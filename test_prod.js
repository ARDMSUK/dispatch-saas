const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  let wsError = false;
  let hasChannelError = false;
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('WebSocket connection to')) wsError = true;
    if (text.includes('CHANNEL_ERROR')) hasChannelError = true;
  });
  await page.goto('https://app.cabai.co.uk/dashboard', { waitUntil: 'networkidle0' });
  console.log(`wsError: ${wsError}, hasChannelError: ${hasChannelError}`);
  await browser.close();
})();
