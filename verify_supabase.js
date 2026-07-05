const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  // Go to login page
  await page.goto('https://app.cabai.co.uk/login', { waitUntil: 'networkidle2' });
  console.log("10. /login loads: YES");

  // Get Supabase instance from window object if possible or just log in and check network
  await page.type('input[type="email"]', 'jamie.allan.business@gmail.com');
  await page.type('input[type="password"]', 'P@ssw0rd1234');
  await page.click('button[type="submit"]');

  await page.waitForNavigation({ waitUntil: 'networkidle2' });
  console.log("11. Login works: YES");

  const url = page.url();
  if (url.includes('/dashboard')) {
    console.log("12. /dashboard loads: YES");
  }

  // Check network requests to see Supabase URL and Key
  console.log("Checking Supabase requests...");
  let supabaseReq = null;
  page.on('request', request => {
    if (request.url().includes('supabase.co')) {
      supabaseReq = request;
    }
  });

  // Reload page to capture requests
  await page.reload({ waitUntil: 'networkidle2' });

  await browser.close();
})();
