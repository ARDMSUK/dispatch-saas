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
        console.error("DECRYPT INTERNAL ERROR:", err.message);
        return null;
    }
}

async function main() {
    const tenant = await prisma.tenant.findUnique({
        where: { id: 'cmotadopt00081184tr3olkzc' }
    });

    console.log("Stripe Key:", tenant.stripeSecretKey);
    const result = decrypt(tenant.stripeSecretKey);
    console.log("Decrypt returned:", result ? "SUCCESS" : "FAIL");
}

main().catch(console.error).finally(() => prisma.$disconnect());
