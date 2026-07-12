import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const PREFIX = 'enc:v1:';

const getEncryptionKey = (): Buffer => {
    const keyStr = process.env.PAYMENT_ENCRYPTION_KEY;
    if (!keyStr) {
        throw new Error('Missing PAYMENT_ENCRYPTION_KEY environment variable. Required for payment operations.');
    }
    if (keyStr.length !== 64) {
        throw new Error('PAYMENT_ENCRYPTION_KEY must be exactly 64 hex characters (32 bytes).');
    }
    return Buffer.from(keyStr, 'hex');
};

// Removed top-level validation to allow safe startup. It will throw when encryption/decryption is attempted.

export function encrypt(text: string | null | undefined): string | null {
    if (!text) return text as null;
    if (text.startsWith(PREFIX)) return text; // Prevent double encryption

    const key = getEncryptionKey();
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');

    return `${PREFIX}${iv.toString('hex')}:${authTag}:${encrypted}`;
}

export function decrypt(encryptedText: string | null | undefined): string | null {
    if (!encryptedText) return encryptedText as null;
    
    // Graceful plaintext fallback
    if (!encryptedText.startsWith(PREFIX)) {
        return encryptedText;
    }

    try {
        const key = getEncryptionKey();
        const withoutPrefix = encryptedText.slice(PREFIX.length);
        const [ivHex, authTagHex, cipherTextHex] = withoutPrefix.split(':');

        if (!ivHex || !authTagHex || !cipherTextHex) {
            console.error('Invalid encryption format encountered.');
            return encryptedText; // Legacy or malformed, return as-is for graceful degradation
        }

        const iv = Buffer.from(ivHex, 'hex');
        const authTag = Buffer.from(authTagHex, 'hex');
        const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
        
        decipher.setAuthTag(authTag);
        
        let decrypted = decipher.update(cipherTextHex, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        
        return decrypted;
    } catch (err) {
        console.error('Failed to decrypt payment credential:', err);
        return encryptedText; // Graceful fallback
    }
}

/**
 * Masks a secret string for safe display to the client.
 * Leaves public identifiers untouched.
 */
export function maskSecret(secret: string | null | undefined): string | null {
    if (!secret) return secret as null;
    
    // If it's encrypted, decrypt first so we can mask the real value length
    // Wait, the requirement says "Never return enc:v1: strings to frontend". 
    // We should return a generic mask if it's a secret.
    const actualLength = secret.startsWith(PREFIX) ? 32 : secret.length; // Approximate length if encrypted

    if (secret.startsWith('sk_live_')) return `sk_live_••••${secret.slice(-4)}`;
    if (secret.startsWith('sk_test_')) return `sk_test_••••${secret.slice(-4)}`;
    if (secret.startsWith('rk_live_')) return `rk_live_••••${secret.slice(-4)}`;
    if (secret.startsWith('rk_test_')) return `rk_test_••••${secret.slice(-4)}`;
    
    return `••••••••••••••••`; // Generic mask for SumUp / Zettle
}

export function isMaskedValue(value: string | null | undefined): boolean {
    if (!value) return false;
    return value.includes('••••');
}
