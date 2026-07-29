import { SignJWT, jwtVerify } from 'jose';
import { prisma } from '@/lib/prisma';

const SECRET_KEY = process.env.AUTH_SECRET || 'dev-secret-key-change-me';
const key = new TextEncoder().encode(SECRET_KEY);

export interface DriverTokenPayload {
    driverId: string;
    tenantId: string;
    name: string;
    callsign: string;
}

export async function signDriverToken(payload: DriverTokenPayload): Promise<string> {
    return new SignJWT({ ...payload })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('7d') // Long lived for mobile app
        .sign(key);
}

export async function verifyDriverToken(token: string): Promise<DriverTokenPayload | null> {
    try {
        const { payload } = await jwtVerify(token, key);
        const driverPayload = payload as unknown as DriverTokenPayload;
        
        if (!driverPayload.tenantId) return null;

        const tenant = await prisma.tenant.findUnique({
            where: { id: driverPayload.tenantId },
            select: { subscriptionStatus: true }
        });

        if (!tenant || (tenant.subscriptionStatus !== 'ACTIVE' && tenant.subscriptionStatus !== 'TRIALING')) {
            return null; // Return null so the endpoint triggers a 401 Unauthorized
        }

        return driverPayload;
    } catch (error) {
        return null;
    }
}

export async function getDriverSession(req: Request): Promise<DriverTokenPayload | null> {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }
    const token = authHeader.split(' ')[1];
    return verifyDriverToken(token);
}
