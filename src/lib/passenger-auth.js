"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.signPassengerToken = signPassengerToken;
exports.verifyPassengerToken = verifyPassengerToken;
const jose_1 = require("jose");
const secretStr = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
if (!secretStr) {
    console.warn("No AUTH_SECRET found in environment variables. Passenger auth will fail.");
}
const secret = new TextEncoder().encode(secretStr || "fallback-if-absolutely-needed");
async function signPassengerToken(payload) {
    if (!secretStr)
        throw new Error("Authentication misconfigured on server.");
    return new jose_1.SignJWT({ ...payload })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setIssuer('cabai:passenger:auth')
        .setAudience('cabai:passenger:api')
        .setExpirationTime('30d')
        .sign(secret);
}
async function verifyPassengerToken(req) {
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
        const { payload } = await (0, jose_1.jwtVerify)(token, secret, {
            issuer: 'cabai:passenger:auth',
            audience: 'cabai:passenger:api',
        });
        if (payload.role !== 'PASSENGER') {
            return null; // Ensure token purpose matches
        }
        return payload;
    }
    catch (err) {
        // Token is invalid, expired, or tampered with
        return null;
    }
}
