import { SignJWT, jwtVerify } from 'jose';

const getSecret = () => {
    const secret = process.env.AUTH_SECRET || process.env.JWT_SECRET;
    if (!secret) throw new Error('AUTH_SECRET is not defined in environment variables');
    return new TextEncoder().encode(secret);
};

export async function signMobileToken(payload: any) {
    const alg = 'HS256';
    return new SignJWT(payload)
        .setProtectedHeader({ alg })
        .setIssuedAt()
        .setExpirationTime('30d') // Long lived for mobile app
        .sign(getSecret());
}

export async function verifyMobileToken(token: string) {
    try {
        const { payload } = await jwtVerify(token, getSecret());
        return payload;
    } catch (error) {
        return null;
    }
}
