const fs = require('fs');
const { Client } = require('pg');

async function main() {
    const envContent = fs.readFileSync('.env.branches', 'utf-8');
    // Extract the raw URL
    const urlMatch = envContent.match(/postgresql:\/\/[^']+/);
    if (!urlMatch) {
        throw new Error("Could not find postgresql URL in .env.branches");
    }
    const dbUrl = urlMatch[0];
    
    // Safety check - MUST NOT BE PRODUCTION
    if (dbUrl.includes('ep-aged-thunder-abb113v4')) {
        throw new Error("ABORT: URL points to production database!");
    }
    console.log("Host verified. Not production.");

    const client = new Client({
        connectionString: dbUrl,
        ssl: { rejectUnauthorized: false }
    });

    await client.connect();

    // Verify idempotencyKey doesn't exist
    const res = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_schema='public' AND table_name='bookings' AND column_name='idempotencyKey';
    `);

    if (res.rows.length > 0) {
        console.log("Column idempotencyKey already exists. Skipping migration.");
    } else {
        console.log("Applying migration...");
        const sql = fs.readFileSync('migration.sql', 'utf-8');
        await client.query(sql);
        console.log("Migration applied successfully.");
    }

    await client.end();
}

main().catch(console.error);
