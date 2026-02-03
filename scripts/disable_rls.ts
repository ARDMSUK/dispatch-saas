
import { Client } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function main() {
    try {
        await client.connect();
        console.log("🔌 Connected to DB. Disabling RLS for API compatibility...");

        const tables = ['drivers', 'bookings', 'customers', 'companies', 'pricing_rules'];

        for (const table of tables) {
            await client.query(`ALTER TABLE ${table} DISABLE ROW LEVEL SECURITY;`);
            console.log(`✅ RLS Disabled: ${table}`);
        }

    } catch (e) {
        console.error("Error:", e);
    } finally {
        await client.end();
    }
}
main();
