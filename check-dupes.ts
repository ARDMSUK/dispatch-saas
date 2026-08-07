import { config } from 'dotenv';
config({ path: '.env.preview' });
process.env.DATABASE_URL = process.env.POSTGRES_URL_NO_SSL + '?sslmode=require';
import { prisma } from './src/lib/prisma';

async function main() {
    const url = process.env.DATABASE_URL || '';
    console.log("DATABASE_URL contains preview:", url.includes('preview'));
    console.log("DATABASE_URL host:", url.split('@')[1]?.split('/')[0]);

    // Find duplicates: group by tenantId and reg
    const duplicates = await prisma.vehicle.groupBy({
        by: ['tenantId', 'reg'],
        _count: { id: true },
        having: { id: { _count: { gt: 1 } } }
    });

    console.log("Found duplicate groups:", duplicates.length);

    for (const group of duplicates) {
        // Keep the first one, delete the rest
        const vehicles = await prisma.vehicle.findMany({
            where: { tenantId: group.tenantId, reg: group.reg },
            orderBy: { createdAt: 'asc' }
        });

        const toDelete = vehicles.slice(1).map(v => v.id);
        console.log(`Deleting duplicates for reg ${group.reg} in tenant ${group.tenantId}:`, toDelete);
        
        await prisma.vehicle.deleteMany({
            where: { id: { in: toDelete } }
        });
    }

    console.log("Cleanup complete.");
}
main().catch(console.error).finally(() => prisma.$disconnect());
