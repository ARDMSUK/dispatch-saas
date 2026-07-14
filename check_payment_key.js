const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const prisma = new PrismaClient();

const ALGORITHM = 'aes-256-gcm';
const PREFIX = 'enc:v1:';

const getEncryptionKey = () => {
    const keyStr = process.env.PAYMENT_ENCRYPTION_KEY;
    return Buffer.from(keyStr, 'hex');
};

function decrypt(encryptedText) {
    if (!encryptedText) return null;
    if (!encryptedText.startsWith(PREFIX)) return encryptedText;

    try {
        const key = getEncryptionKey();
        const withoutPrefix = encryptedText.slice(PREFIX.length);
        const [ivHex, authTagHex, cipherTextHex] = withoutPrefix.split(':');

        const iv = Buffer.from(ivHex, 'hex');
        const authTag = Buffer.from(authTagHex, 'hex');
        const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
        
        decipher.setAuthTag(authTag);
        
        let decrypted = decipher.update(cipherTextHex, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        
        return decrypted;
    } catch (err) {
        return null;
    }
}

async function main() {
    const job = await prisma.job.findUnique({
        where: { id: 406 },
        include: { tenant: true }
    });

    if (!job) {
        console.log("Job not found");
        return;
    }

    console.log("2. Job belongs to London Exec Test:", job.tenant.name === "London Exec Test");
    console.log("4. exact tenantId on Job #406:", job.tenantId);
    console.log("5. exact tenant name/slug for Job #406:", job.tenant.name, job.tenant.slug);
    console.log("6. stripeSecretKey exists:", !!job.tenant.stripeSecretKey);
    console.log("7. stripeSecretKey starts with enc:v1:", job.tenant.stripeSecretKey?.startsWith('enc:v1:'));
    
    let decryptedKey = null;
    let decryptSucceeded = false;
    let isTestMode = false;
    let isLiveMode = false;
    
    try {
        decryptedKey = decrypt(job.tenant.stripeSecretKey);
        decryptSucceeded = !!decryptedKey;
        if (decryptedKey) {
            isTestMode = decryptedKey.startsWith('sk_test_') || decryptedKey.startsWith('rk_test_');
            isLiveMode = decryptedKey.startsWith('sk_live_') || decryptedKey.startsWith('rk_live_');
        }
    } catch(e) {
        console.log("Decrypt error:", e.message);
    }
    
    console.log("8. decrypt(tenant.stripeSecretKey) returns a non-empty value:", decryptSucceeded);
    console.log("9. Key mode: sk_test:", isTestMode, "sk_live:", isLiveMode);
    
    console.log("10. PAYMENT_ENCRYPTION_KEY available:", !!process.env.PAYMENT_ENCRYPTION_KEY);

}

main().catch(console.error).finally(() => prisma.$disconnect());
