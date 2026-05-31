import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

async function generatePDFs() {
    console.log("Starting legal PDF generation script...");

    // Setup output paths
    const outputDir = path.resolve(__dirname, '../public/legal');
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
        console.log(`Created directory: ${outputDir}`);
    }

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    const targets = [
        { path: 'terms', filename: 'terms.pdf' },
        { path: 'privacy', filename: 'privacy.pdf' },
        { path: 'gdpr', filename: 'gdpr.pdf' }
    ];

    for (const target of targets) {
        const url = `http://localhost:3000/legal/${target.path}`;
        const outputPath = path.join(outputDir, target.filename);
        
        console.log(`Loading URL: ${url} ...`);
        await page.goto(url, { waitUntil: 'networkidle' });

        // Wait a small moment for any transitions/animations
        await page.waitForTimeout(1000);

        console.log(`Printing PDF to: ${outputPath} ...`);
        await page.pdf({
            path: outputPath,
            format: 'A4',
            margin: {
                top: '20mm',
                bottom: '20mm',
                left: '20mm',
                right: '20mm'
            },
            printBackground: true
        });
        
        console.log(`Generated ${target.filename} successfully.`);
    }

    await browser.close();
    console.log("PDF generation complete!");
}

generatePDFs().catch(err => {
    console.error("Failed to generate PDFs:", err);
    process.exit(1);
});
