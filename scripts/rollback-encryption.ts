import { PrismaClient } from '@prisma/client';
import { decrypt, isMaskedValue } from '../src/lib/encryption';

const prisma = new PrismaClient();

const isDryRun = process.argv.includes('--dry-run');
const isApply = process.argv.includes('--apply');

if (!isDryRun && !isApply) {
    console.error('Usage: npx tsx scripts/rollback-encryption.ts [--dry-run | --apply]');
    process.exit(1);
}

if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is missing.');
    process.exit(1);
}

if (!process.env.PAYMENT_ENCRYPTION_KEY || process.env.PAYMENT_ENCRYPTION_KEY.length !== 64) {
    console.error('PAYMENT_ENCRYPTION_KEY is missing or invalid.');
    process.exit(1);
}

const tenantFields: Array<keyof any> = [
    'stripeSecretKey',
    'sumupClientSecret',
    'sumupAccessToken',
    'sumupRefreshToken',
    'zettleClientSecret',
    'zettleAccessToken',
    'zettleRefreshToken'
];

const driverFields: Array<keyof any> = [
    'sumupAccessToken',
    'sumupRefreshToken',
    'zettleAccessToken',
    'zettleRefreshToken'
];

async function main() {
    console.log(`Starting Phase B Rollback: ${isDryRun ? 'DRY RUN' : 'APPLY'}`);
    
    let totalTenantRecords = 0;
    let totalDriverRecords = 0;
    let tenantFieldsDecrypted = 0;
    let driverFieldsDecrypted = 0;
    let skippedEmpty = 0;
    let skippedPlaintext = 0;
    let skippedMasked = 0;
    let malformedCount = 0;

    // Process Tenants
    const tenants = await prisma.tenant.findMany();
    for (const tenant of tenants) {
        let needsUpdate = false;
        const updateData: any = {};

        for (const field of tenantFields) {
            const value = tenant[field] as string | null | undefined;
            if (!value) {
                skippedEmpty++;
                continue;
            }
            if (isMaskedValue(value)) {
                skippedMasked++;
                continue;
            }
            if (!value.startsWith('enc:v1:')) {
                skippedPlaintext++;
                continue;
            }

            try {
                const decrypted = decrypt(value);
                if (decrypted && decrypted !== value) {
                    updateData[field] = decrypted;
                    needsUpdate = true;
                    tenantFieldsDecrypted++;
                } else {
                    malformedCount++;
                }
            } catch (error) {
                malformedCount++;
            }
        }

        if (needsUpdate) {
            totalTenantRecords++;
            if (isApply) {
                await prisma.tenant.update({
                    where: { id: tenant.id },
                    data: updateData
                });
            }
        }
    }

    // Process Drivers
    const drivers = await prisma.driver.findMany();
    for (const driver of drivers) {
        let needsUpdate = false;
        const updateData: any = {};

        for (const field of driverFields) {
            const value = driver[field] as string | null | undefined;
            if (!value) {
                skippedEmpty++;
                continue;
            }
            if (isMaskedValue(value)) {
                skippedMasked++;
                continue;
            }
            if (!value.startsWith('enc:v1:')) {
                skippedPlaintext++;
                continue;
            }

            try {
                const decrypted = decrypt(value);
                if (decrypted && decrypted !== value) {
                    updateData[field] = decrypted;
                    needsUpdate = true;
                    driverFieldsDecrypted++;
                } else {
                    malformedCount++;
                }
            } catch (error) {
                malformedCount++;
            }
        }

        if (needsUpdate) {
            totalDriverRecords++;
            if (isApply) {
                await prisma.driver.update({
                    where: { id: driver.id },
                    data: updateData
                });
            }
        }
    }

    console.log('\n--- Rollback Summary ---');
    console.log(`Mode: ${isDryRun ? 'DRY RUN' : 'APPLY'}`);
    console.log(`Tenant records to revert: ${totalTenantRecords}`);
    console.log(`Driver records to revert: ${totalDriverRecords}`);
    console.log(`Tenant fields to decrypt: ${tenantFieldsDecrypted}`);
    console.log(`Driver fields to decrypt: ${driverFieldsDecrypted}`);
    console.log(`Skipped (Empty/Null): ${skippedEmpty}`);
    console.log(`Skipped (Already Plaintext): ${skippedPlaintext}`);
    console.log(`Skipped (Masked Placeholders): ${skippedMasked}`);
    console.log(`Malformed (Failed Decrypt): ${malformedCount}`);
    
    console.log('\nDone.');
}

main()
    .catch((e) => {
        console.error('Rollback failed:', e.message);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
