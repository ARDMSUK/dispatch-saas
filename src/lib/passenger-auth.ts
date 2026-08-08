import { SignJWT, jwtVerify } from 'jose';

const secretStr = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
if (!secretStr) {
    console.warn("No AUTH_SECRET found in environment variables. Passenger auth will fail.");
}
const secret = new TextEncoder().encode(secretStr || "fallback-if-absolutely-needed");

export interface PassengerAuthPayload {
    customerId: string;
    tenantId: string;
    role: 'PASSENGER';
}

export async function signPassengerToken(payload: PassengerAuthPayload): Promise<string> {
    if (!secretStr) throw new Error("Authentication misconfigured on server.");

    return new SignJWT({ ...payload })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setIssuer('cabai:passenger:auth')
        .setAudience('cabai:passenger:api')
        .setExpirationTime('30d')
        .sign(secret);
}

export async function verifyPassengerToken(req: Request): Promise<PassengerAuthPayload | null> {
    if (!secretStr) {
        console.error("verifyPassengerToken called but AUTH_SECRET is missing.");
        return null;
    }

    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
        return null;
    }

    try {
        const { payload } = await jwtVerify(token, secret, {
            issuer: 'cabai:passenger:auth',
            audience: 'cabai:passenger:api',
        });
        
        if (payload.role !== 'PASSENGER') {
            return null; // Ensure token purpose matches
        }

        return payload as unknown as PassengerAuthPayload;
    } catch (err) {
        // Token is invalid, expired, or tampered with
        return null;
    }
}
