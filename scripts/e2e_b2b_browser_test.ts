import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

async function run() {
    console.log("🚀 Starting Playwright B2B E2E Test...");

    const artifactDir = '/Users/ar/.gemini/antigravity/brain/b8cdf822-3cff-415d-9d77-a2d0c6df7782';
    if (!fs.existsSync(artifactDir)) {
        fs.mkdirSync(artifactDir, { recursive: true });
    }

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        viewport: { width: 1280, height: 800 }
    });
    const page = await context.newPage();

    try {
        // 1. Navigate to login
        console.log("🌐 Navigating to login page...");
        await page.goto('http://localhost:3000/login');
        await page.waitForLoadState('networkidle');

        // 2. Fill login credentials
        console.log("🔑 Logging in as admin@testcorp.com...");
        await page.fill('input[name="email"]', 'admin@testcorp.com');
        await page.fill('input[name="password"]', 'password123');

        // 3. Click Sign In
        console.log("🖱️ Submitting credentials...");
        await page.click('button[type="submit"]');

        // 4. Wait for dashboard redirection
        console.log("🔄 Waiting for redirection...");
        await page.waitForURL('**/dashboard', { timeout: 15000 });
        console.log("✅ Successfully logged in and redirected to Operator Dashboard.");

        // 5. Navigate to B2B bookings
        console.log("🌐 Navigating to B2B Bookings page...");
        await page.goto('http://localhost:3000/b2b/bookings');
        await page.waitForLoadState('networkidle');

        // 6. Capture initial bookings list screenshot
        const bookingsInitialPath = path.join(artifactDir, 'b2b_bookings_initial.png');
        await page.screenshot({ path: bookingsInitialPath });
        console.log(`📸 Saved initial bookings screenshot to ${bookingsInitialPath}`);

        // 7. Click "New Booking" button
        console.log("🖱️ Clicking 'New Booking' button...");
        await page.click('button:has-text("New Booking")');
        await page.waitForSelector('text=Schedule Corporate Travel');

        // 8. Fill new booking form
        console.log("✍️ Filling in corporate travel form...");
        await page.fill('input[placeholder="Name"]', 'Playwright Automated QA');
        await page.fill('input[placeholder="+44..."]', '+447700900999');
        await page.fill('input[placeholder="Company HQ or Hotel"]', 'London City Airport');
        await page.fill('input[placeholder="Airport, Station, Office"]', 'Waterloo Station');
        await page.fill('input[type="date"]', '2026-06-05');
        await page.fill('input[type="time"]', '14:30');
        await page.fill('input[placeholder="e.g. Project Alpha, CC:10492"]', 'QA:8888');

        // 9. Submit booking
        console.log("🖱️ Submitting booking form...");
        await page.click('button:has-text("Confirm Setup")');
        await page.waitForSelector('text=Schedule Corporate Travel', { state: 'detached' });
        console.log("✅ Booking dialog closed successfully.");

        // 10. Wait for bookings list to refresh
        await page.waitForTimeout(2000);
        const bookingsFinalPath = path.join(artifactDir, 'b2b_bookings_final.png');
        await page.screenshot({ path: bookingsFinalPath });
        console.log(`📸 Saved final bookings screenshot to ${bookingsFinalPath}`);

        // 11. Navigate to ledger
        console.log("🌐 Navigating to B2B Ledger page...");
        await page.goto('http://localhost:3000/b2b/ledger');
        await page.waitForLoadState('networkidle');

        // 12. Capture ledger screenshot
        const ledgerPath = path.join(artifactDir, 'b2b_ledger.png');
        await page.screenshot({ path: ledgerPath });
        console.log(`📸 Saved ledger screenshot to ${ledgerPath}`);

        console.log("🎉 Playwright B2B E2E browser test completed successfully! 🎉");

    } catch (error) {
        console.error("❌ E2E Browser Test Failed:", error);
        const errorPath = path.join(artifactDir, 'e2e_error.png');
        await page.screenshot({ path: errorPath });
        console.log(`📸 Saved error screenshot to ${errorPath}`);
        throw error;
    } finally {
        await browser.close();
    }
}

run().catch((err) => {
    console.error(err);
    process.exit(1);
});
