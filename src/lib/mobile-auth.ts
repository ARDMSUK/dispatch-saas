import { SignJWT, jwtVerify } from 'jose';
import { prisma } from '@/lib/prisma';

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
        
        const tenantId = payload.tenantId as string;
        if (!tenantId) return null;

        const tenant = await prisma.tenant.findUnique({
            where: { id: tenantId },
            select: { subscriptionStatus: true }
        });

        if (!tenant || (tenant.subscriptionStatus !== 'ACTIVE' && tenant.subscriptionStatus !== 'TRIALING')) {
            return null; // Return null so the endpoint triggers a 401 Unauthorized
        }

        return payload;
    } catch (error) {
        return null;
    }
}
