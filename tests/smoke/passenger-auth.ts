import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.smoke' });
import { SignJWT } from 'jose';

const baseUrl = 'http://localhost:3000';
const bypassSecret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET || '';
const jwtSecret = process.env.AUTH_SECRET || 'fallback-secret-for-local-dev';
const tenantSlug = process.env.SMOKE_TENANT_SLUG || 'bourneend';
const mockTenantId = 'mock-tenant-id';
const mockCustomerId = 'mock-customer-id';
const mockJobId = '12345';

async function generateToken(tenantId: string, customerId: string) {
    const secret = new TextEncoder().encode(jwtSecret);
    return new SignJWT({ tenantId, customerId, role: 'PASSENGER' })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setIssuer('cabai:passenger:auth')
        .setAudience('cabai:passenger:api')
        .setExpirationTime('30d')
        .sign(secret);
}

async function runTests() {
    console.log("Starting Passenger Auth Security Tests...\n");
    let passed = 0;
    let failed = 0;

    const validToken = await generateToken(mockTenantId, mockCustomerId);
    const invalidTenantToken = await generateToken('wrong-tenant', mockCustomerId);

    const headers: Record<string, string> = {
        'Content-Type': 'application/json'
    };
    if (bypassSecret) {
        headers['x-vercel-protection-bypass'] = bypassSecret;
    }

    const testCases = [
        {
            name: "1. update-profile - Missing Token (Should 401)",
            url: `/api/booker/${tenantSlug}/auth/update-profile`,
            method: 'POST', // Most NextJS API routes I've seen use POST for updates here unless specified
            headers: { ...headers },
            body: { name: "Attacker", email: "attack@example.com" },
            expectedStatus: [401, 404] // 404 if tenant not found in DB during test
        },
        {
            name: "2. update-profile - Invalid Tenant Token (Should 403 or 401/404)",
            url: `/api/booker/${tenantSlug}/auth/update-profile`,
            method: 'POST',
            headers: { ...headers, 'Authorization': `Bearer ${invalidTenantToken}` },
            body: { name: "Attacker", email: "attack@example.com" },
            expectedStatus: [403, 404, 401]
        },
        {
            name: "3. setup-intent - Missing Token (Should 401)",
            url: `/api/booker/${tenantSlug}/stripe/setup-intent`,
            method: 'POST',
            headers: { ...headers },
            body: {},
            expectedStatus: [401, 404]
        },
        {
            name: "4. payment-methods - Missing Token (Should 401)",
            url: `/api/booker/${tenantSlug}/stripe/payment-methods`,
            method: 'GET',
            headers: { ...headers },
            expectedStatus: [401, 404]
        },
        {
            name: "5. track/[id] - Missing Token (Should 401)",
            url: `/api/booker/${tenantSlug}/track/${mockJobId}`,
            method: 'GET',
            headers: { ...headers },
            expectedStatus: [401, 404]
        },
        {
            name: "6. Guest Booking - Missing Token (Should work or 400 due to validation, but NOT 401)",
            url: `/api/booker/${tenantSlug}/book`,
            method: 'POST',
            headers: { ...headers },
            body: { passengerPhone: "+447000000000" },
            expectedStatus: [400, 429, 200, 404, 403] // 401 is failure here
        },
        {
            name: "7. Auth Booking - Invalid Token (Should 401 or 404 if tenant missing)",
            url: `/api/booker/${tenantSlug}/book`,
            method: 'POST',
            headers: { ...headers, 'Authorization': 'Bearer bad.token.here' },
            body: { passengerPhone: "+447000000000" },
            expectedStatus: [401, 404]
        }
    ];

    for (const test of testCases) {
        console.log(`[TEST] ${test.name}`);
        try {
            const res = await fetch(`${baseUrl}${test.url}`, {
                method: test.method,
                headers: test.headers,
                body: test.body ? JSON.stringify(test.body) : undefined,
            });

            if (test.expectedStatus.includes(res.status)) {
                console.log(`✅ PASS (Status ${res.status})`);
                passed++;
            } else if (res.status === 401 && test.name.includes("Guest Booking")) {
                console.log(`❌ FAIL (Status ${res.status} - Guest booking should not 401)`);
                failed++;
            } else {
                console.log(`❌ FAIL (Status ${res.status}, Expected one of: ${test.expectedStatus.join(', ')})`);
                failed++;
            }
        } catch (e: any) {
            console.log(`❌ ERROR: ${e.message}`);
            failed++;
        }
        console.log('---');
    }

    console.log(`\nResults: ${passed} passed, ${failed} failed.`);
    if (failed > 0) {
        process.exit(1);
    }
}

runTests();
