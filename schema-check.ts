import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
    datasourceUrl: process.env.DATABASE_URL
});

async function run() {
    try {
        console.log("=== DB SCHEMA CHECK ===");
        
        // 1. Check if public.bookings exists
        const bookingsTableResult = await prisma.$queryRaw`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' AND table_name = 'bookings'
            );
        `;
        console.log("public.bookings exists:", bookingsTableResult[0].exists);

        // 2. Check if public."Job" exists
        const jobTableResult = await prisma.$queryRaw`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' AND table_name = 'Job'
            );
        `;
        console.log("public.\"Job\" exists:", jobTableResult[0].exists);

        // 3. Check columns in bookings
        if (bookingsTableResult[0].exists) {
            const bookingsColResult = await prisma.$queryRaw`
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'idempotencyKey';
            `;
            console.log("idempotencyKey on public.bookings exists:", bookingsColResult.length > 0);
        }

        // 4. Check columns in Job
        if (jobTableResult[0].exists) {
            const jobColResult = await prisma.$queryRaw`
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_schema = 'public' AND table_name = 'Job' AND column_name = 'idempotencyKey';
            `;
            console.log("idempotencyKey on public.\"Job\" exists:", jobColResult.length > 0);
        }

        // 5. Check unique indexes involving idempotencyKey
        const indexResult = await prisma.$queryRaw`
            SELECT
                t.relname AS table_name,
                i.relname AS index_name,
                a.attname AS column_name
            FROM
                pg_class t,
                pg_class i,
                pg_index ix,
                pg_attribute a
            WHERE
                t.oid = ix.indrelid
                AND i.oid = ix.indexrelid
                AND a.attrelid = t.oid
                AND a.attnum = ANY(ix.indkey)
                AND t.relkind = 'r'
                AND ix.indisunique = true
                AND a.attname = 'idempotencyKey';
        `;
        console.log("Unique indexes involving idempotencyKey:");
        if (indexResult.length === 0) console.log("None");
        else {
            for (const row of indexResult) {
                // To get all columns for that index, query specifically:
                const indexCols = await prisma.$queryRaw`
                    SELECT a.attname
                    FROM pg_index ix
                    JOIN pg_class i ON i.oid = ix.indexrelid
                    JOIN pg_attribute a ON a.attrelid = ix.indrelid AND a.attnum = ANY(ix.indkey)
                    WHERE i.relname = ${row.index_name}
                `;
                console.log(`- Index: ${row.index_name}, Table: ${row.table_name}, Columns: ${indexCols.map(c => c.attname).join(', ')}`);
            }
        }
    } finally {
        await prisma.$disconnect();
    }
}

run();
