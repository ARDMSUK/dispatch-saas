
import { Client } from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

// Load env
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
    if (!process.env.DATABASE_URL) {
        console.error("❌ DATABASE_URL is missing in .env");
        process.exit(1);
    }

    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false } // Required for some hosted DBs
    });

    try {
        await client.connect();
        console.log("✅ Connected to database");

        // 1. Check/Shim Supabase Auth (for pure Postgres compatibility)
        console.log("🛠️  Checking extensions and schemas...");
        await client.query(`create extension if not exists postgis;`);

        try {
            await client.query(`create schema if not exists auth;`);
            await client.query(`
                create table if not exists auth.users (
                    id uuid primary key default gen_random_uuid(),
                    email text unique,
                    role text default 'authenticated',
                    created_at timestamptz default now(),
                    updated_at timestamptz default now()
                );
            `);
            console.log("✅ 'auth.users' shim verified (for Neon compatibility).");
        } catch (e) {
            console.log("ℹ️  Auth schema setup skipped (likely already exists or managed).");
        }

        // 2. Read Schema
        const schemaPath = path.join(__dirname, '../supabase/schema.sql');
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');

        // Remove 'create extension ...' to avoid permissions errors if already enabled
        // Also remove 'create schema auth' if we handled it manually above, although IF NOT EXISTS is safe.
        // We'll roughly split by commands.

        console.log("🔍 Checking if schema exists...");
        const { rows } = await client.query("select to_regclass('public.companies') as exists");

        if (!rows[0].exists) {
            console.log("📜 Applying Schema...");
            // Execute schema in one go (simple schemas work fine this way usually)
            await client.query(schemaSql);
            console.log("✅ Schema applied successfully.");
        } else {
            console.log("ℹ️  Schema already applied (Tables exist). Skipping.");
        }

        // 3. Read Seed
        const seedPath = path.join(__dirname, '../../../brain/36503bb3-94bd-4374-892a-6652c78c16e1/company_seed.sql');

        if (fs.existsSync(seedPath)) {
            console.log("🌱 Applying Seed Data...");
            const seedSql = fs.readFileSync(seedPath, 'utf8');
            await client.query(seedSql);
            console.log("✅ Seed data applied.");
        } else {
            console.log("⚠️  Seed file not found at", seedPath);
        }

        console.log("\nDATA SETUP COMPLETE! 🚀");
        console.log("You can now restart your app.");

    } catch (e) {
        console.error("❌ Setup Failed:", e);
    } finally {
        await client.end();
    }
}

main();
