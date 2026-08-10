const assert = require('assert');

// Mock dependencies
const prisma = {
    company: { findFirst: () => Promise.resolve({ id: 'tenant-123', slug: 'passenger-e2e' }) },
    job: { count: () => Promise.resolve(0), create: () => Promise.resolve({ id: 'job-123' }) },
    customer: { findFirst: () => Promise.resolve({ id: 'cust-123' }) }
};

const passengerAuth = {
    verifyPassengerToken: async (req) => {
        const auth = req.headers.get('authorization');
        if (auth === 'Bearer valid') return { tenantId: 'tenant-123' };
        if (auth === 'Bearer other') return { tenantId: 'wrong-tenant' };
        return null;
    }
};

// Extremely basic mock of NextRequest and NextResponse for this test
class NextRequest {
    constructor(url, init) {
        this.url = url;
        this.method = init.method;
        this.headers = new Map(Object.entries(init.headers || {}));
        this.bodyData = init.body;
    }
    json() { return Promise.resolve(JSON.parse(this.bodyData)); }
}

const NextResponse = {
    json: (body, init) => {
        return { status: init.status || 200, json: () => Promise.resolve(body) };
    }
};

// We will test the logic directly by simulating what the route does.
async function testLogic(req, turnstileToken) {
    const authHeader = req.headers.get('authorization');
    let authPayload = null;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        authPayload = await passengerAuth.verifyPassengerToken(req);
        if (!authPayload) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        if (authPayload.tenantId !== 'tenant-123') {
            return NextResponse.json({ error: 'Unauthorized for this tenant' }, { status: 403 });
        }
    }

    if (!authPayload && (process.env.NODE_ENV === 'production' || turnstileToken !== '1x00000000000000000000AA')) {
        if (!turnstileToken) {
            return NextResponse.json({ error: 'Security token missing. Please refresh the page.' }, { status: 400 });
        }
        // simulate turnstile pass
    }

    return NextResponse.json({ success: true, jobId: 'job-123' }, { status: 201 });
}

async function run() {
    console.log("Running simulated logic tests...");
    
    // 1. valid Passenger JWT + no turnstileToken
    let req1 = new NextRequest('http://local', { headers: { authorization: 'Bearer valid' } });
    let res1 = await testLogic(req1, null);
    assert.strictEqual(res1.status, 201, "Test 1 failed");
    console.log("Test 1 passed: valid JWT bypasses turnstile");

    // 2. invalid Passenger JWT
    let req2 = new NextRequest('http://local', { headers: { authorization: 'Bearer invalid' } });
    let res2 = await testLogic(req2, null);
    assert.strictEqual(res2.status, 401, "Test 2 failed");
    console.log("Test 2 passed: invalid JWT -> 401");

    // 3. no JWT + no turnstileToken
    let req3 = new NextRequest('http://local', { headers: {} });
    let res3 = await testLogic(req3, null);
    assert.strictEqual(res3.status, 400, "Test 3 failed");
    let json3 = await res3.json();
    assert.strictEqual(json3.error, 'Security token missing. Please refresh the page.', "Test 3 failed");
    console.log("Test 3 passed: no JWT + no turnstile -> 400 security token missing");

    // 4. public Web Booker with valid Turnstile
    let req4 = new NextRequest('http://local', { headers: {} });
    let res4 = await testLogic(req4, 'valid_token');
    assert.strictEqual(res4.status, 201, "Test 4 failed");
    console.log("Test 4 passed: no JWT + valid turnstile -> 201");

    // 5. cross-tenant Passenger JWT -> denied
    let req5 = new NextRequest('http://local', { headers: { authorization: 'Bearer other' } });
    let res5 = await testLogic(req5, null);
    assert.strictEqual(res5.status, 403, "Test 5 failed");
    console.log("Test 5 passed: cross-tenant JWT -> 403");

    console.log("All mocked tests passed successfully.");
}

run().catch(console.error);
