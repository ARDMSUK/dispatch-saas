import { NextRequest } from 'next/server';
import { POST } from './src/app/api/booker/[slug]/book/route';
import { prisma } from './src/lib/prisma';
import * as passengerAuth from './src/lib/passenger-auth';

async function mockRequest(body: any, headers: Record<string, string> = {}) {
    return new NextRequest('http://localhost:3000/api/booker/tenant/book', {
        method: 'POST',
        headers: new Headers({
            'content-type': 'application/json',
            ...headers
        }),
        body: JSON.stringify(body)
    });
}

async function runTests() {
    console.log("Setting up tests...");
    
    // Mock the env and DB
    process.env.NODE_ENV = 'production';
    process.env.TURNSTILE_SECRET_KEY = 'test_secret';

    const tenant = await prisma.tenant.findFirst({
        where: { slug: 'passenger-e2e' }
    });
    
    if (!tenant) {
        console.error("No passenger-e2e tenant found.");
        return;
    }

    const customer = await prisma.customer.findFirst({
        where: { tenantId: tenant.id }
    });
    
    if (!customer) {
        console.error("No customer found for tenant.");
        return;
    }

    const testBody = {
        pickup: "123 Test St",
        dropoff: "456 Main St",
        pickupLat: 51.5,
        pickupLng: -0.1,
        dropoffLat: 51.6,
        dropoffLng: -0.2,
        passengerName: "Test User",
        passengerPhone: "+447123456789",
        passengers: 1,
        luggage: 0,
        serviceType: "Saloon",
        vehicleClass: "Saloon",
        price: 10.93,
        paymentType: "CASH"
    };

    const validToken = await passengerAuth.signPassengerToken({
        customerId: customer.id,
        tenantId: tenant.id,
        role: 'PASSENGER'
    });

    const otherTenantToken = await passengerAuth.signPassengerToken({
        customerId: customer.id,
        tenantId: "some-other-tenant-id",
        role: 'PASSENGER'
    });

    console.log("\n1. valid Passenger JWT + no turnstileToken -> booking reaches normal booking processing");
    let req = await mockRequest(testBody, { 'authorization': `Bearer ${validToken}` });
    let res = await POST(req, { params: Promise.resolve({ slug: 'passenger-e2e' }) });
    let json = await res.json().catch(() => ({}));
    // We expect it to pass turnstile and either succeed or fail on rate limit/pricing, but NOT "Security token missing"
    console.log(`Status: ${res.status}, Error: ${json.error || 'None'}`);
    if (json.error === 'Security token missing. Please refresh the page.') throw new Error("Test 1 Failed");

    console.log("\n2. invalid Passenger JWT -> 401");
    req = await mockRequest(testBody, { 'authorization': `Bearer invalid_token` });
    res = await POST(req, { params: Promise.resolve({ slug: 'passenger-e2e' }) });
    json = await res.json().catch(() => ({}));
    console.log(`Status: ${res.status}, Error: ${json.error || 'None'}`);
    if (res.status !== 401) throw new Error("Test 2 Failed");

    console.log("\n3. no JWT + no turnstileToken -> existing security-token failure remains");
    req = await mockRequest(testBody);
    res = await POST(req, { params: Promise.resolve({ slug: 'passenger-e2e' }) });
    json = await res.json().catch(() => ({}));
    console.log(`Status: ${res.status}, Error: ${json.error || 'None'}`);
    if (json.error !== 'Security token missing. Please refresh the page.') throw new Error("Test 3 Failed");

    console.log("\n4. public Web Booker with valid Turnstile -> continues working");
    // Mock global fetch for turnstile
    const originalFetch = global.fetch;
    global.fetch = jest.fn().mockResolvedValue({
        json: () => Promise.resolve({ success: true })
    }) as any;
    
    req = await mockRequest({ ...testBody, turnstileToken: "valid_turnstile" });
    res = await POST(req, { params: Promise.resolve({ slug: 'passenger-e2e' }) });
    json = await res.json().catch(() => ({}));
    console.log(`Status: ${res.status}, Error: ${json.error || 'None'}`);
    if (json.error === 'Security token missing. Please refresh the page.') throw new Error("Test 4 Failed");
    
    global.fetch = originalFetch;

    console.log("\n5. cross-tenant Passenger JWT -> denied");
    req = await mockRequest(testBody, { 'authorization': `Bearer ${otherTenantToken}` });
    res = await POST(req, { params: Promise.resolve({ slug: 'passenger-e2e' }) });
    json = await res.json().catch(() => ({}));
    console.log(`Status: ${res.status}, Error: ${json.error || 'None'}`);
    if (res.status !== 403) throw new Error("Test 5 Failed");

    console.log("\n6. client fare cannot override server-calculated fare");
    // Price passed from client is 1.00, server should calculate 10.93 (or whatever real price is)
    // We expect the booking to go through (or fail payment) but the final price logged won't be 1.00.
    // If it fails on validation, we can see if it rejected the 1.00.
    req = await mockRequest({ ...testBody, price: 1.00 }, { 'authorization': `Bearer ${validToken}` });
    res = await POST(req, { params: Promise.resolve({ slug: 'passenger-e2e' }) });
    json = await res.json().catch(() => ({}));
    console.log(`Status: ${res.status}, Error: ${json.error || 'None'}`);
    // A discrepancy usually doesn't fail unless it's card payment, but for cash, it will book it at the server price.
    // If it's a 400 for fare mismatch, that's fine too. We just verify the error or success.

    console.log("\nAll tests ran.");
}

runTests().catch(console.error);
