const { chromium } = require('playwright');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on('console', msg => console.log('BROWSER LOG:', msg.text()));

  try {
    console.log('Navigating to https://app.cabai.co.uk/booker/bourneend...');
    await page.goto('https://app.cabai.co.uk/booker/bourneend');
    await page.waitForTimeout(2000);

    console.log('Filling form...');
    
    // Pickup
    await page.fill('input[placeholder="Pickup location"]', 'lhr');
    await page.waitForTimeout(1000);
    await page.waitForSelector('text=Heathrow Terminal 2', { timeout: 5000 });
    await page.click('text=Heathrow Terminal 2');
    await page.waitForTimeout(1000);

    // Dropoff
    await page.fill('input[placeholder="Where to?"]', 'lgw');
    await page.waitForTimeout(1000);
    await page.waitForSelector('text=Gatwick Airport South Terminal', { timeout: 5000 });
    await page.click('text=Gatwick Airport South Terminal');
    await page.waitForTimeout(1000);

    // Time (tomorrow 10 AM)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0] + 'T10:00';
    await page.fill('input[type="datetime-local"]', dateStr);

    console.log('Taking screenshot before quote...');
    await page.screenshot({ path: 'test-19a-before-quote.png' });

    console.log('Clicking Calculate Quote...');
    await page.click('button:has-text("Calculate Quote")');
    
    // Wait a bit
    await page.waitForTimeout(3000);

    console.log('Taking screenshot after quote...');
    await page.screenshot({ path: 'test-19a-after-quote.png' });

    const text2 = await page.innerText('body');
    if (!text2.includes('Passenger Details')) {
        console.log('Failed to reach step 2. Check test-19a-after-quote.png');
        throw new Error('Could not proceed to step 2');
    }

    console.log('Filling passenger details...');
    await page.fill('input[placeholder="Full Name"]', 'Test User 19A');
    await page.fill('input[placeholder="Phone Number"]', '07700900191');
    await page.fill('input[placeholder="Email Address"]', 'test19a@cabai.co.uk');

    console.log('Clicking CASH...');
    await page.click('text=CASH');

    console.log('Waiting for Turnstile...');
    await page.waitForTimeout(3000);

    console.log('Submitting...');
    await page.click('button:has-text("Confirm & Book")');

    console.log('Waiting for success screen...');
    await page.waitForTimeout(5000);

    // Look for Toast
    const toastExists = await page.$('ol li:has-text("Booking Request Received")') !== null || await page.$('div:has-text("Booking Request Received")') !== null;
    console.log('Toast "Booking Request Received" present:', toastExists);

    await page.screenshot({ path: 'test-19a-success.png' });
    console.log('Screenshot saved to test-19a-success.png');

    console.log('\n--- CHECKING DB ---');
    const job = await prisma.job.findFirst({
        where: { passengerEmail: 'test19a@cabai.co.uk' },
        orderBy: { bookedAt: 'desc' },
        include: { ActivityLog: true }
    });

    console.log('Job found:', JSON.stringify(job, null, 2));

  } catch (error) {
    console.error(error);
  } finally {
    await browser.close();
    await prisma.$disconnect();
  }
})();
