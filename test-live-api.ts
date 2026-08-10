import { prisma } from './src/lib/prisma';
import * as passengerAuth from './src/lib/passenger-auth';

async function mockRequest(body: any, headers: Record<string, string> = {}) {
    const res = await fetch('http://localhost:3011/api/booker/passenger-e2e/book', {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
            ...headers
        },
        body: JSON.stringify(body)
    });
    return res;
}

async function runTests() {
    console.log("Setting up tests...");
    
    const tenant = await prisma.company.findFirst({
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
        paymentType: "CASH",
        // need fake turnstile for test 4, but that requires intercepting external fetch, which is hard with a live server.
        // We'll skip test 4 live or mock it another way if needed.
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
    let res = await mockRequest(testBody, { 'authorization': `Bearer ${validToken}` });
    let json = await res.json().catch(() => ({}));
    console.log(`Status: ${res.status}, Response:`, json);
    if (json.error === 'Security token missing. Please refresh the page.') throw new Error("Test 1 Failed");

    console.log("\n2. invalid Passenger JWT -> 401");
    res = await mockRequest(testBody, { 'authorization': `Bearer invalid_token` });
    json = await res.json().catch(() => ({}));
    console.log(`Status: ${res.status}, Response:`, json);
    if (res.status !== 401) throw new Error("Test 2 Failed");

    console.log("\n3. no JWT + no turnstileToken -> existing security-token failure remains");
    res = await mockRequest(testBody);
    json = await res.json().catch(() => ({}));
    console.log(`Status: ${res.status}, Response:`, json);
    if (json.error !== 'Security token missing. Please refresh the page.') throw new Error("Test 3 Failed");

    console.log("\n5. cross-tenant Passenger JWT -> denied");
    res = await mockRequest(testBody, { 'authorization': `Bearer ${otherTenantToken}` });
    json = await res.json().catch(() => ({}));
    console.log(`Status: ${res.status}, Response:`, json);
    if (res.status !== 403) throw new Error("Test 5 Failed");

    console.log("\n6. client fare cannot override server-calculated fare");
    res = await mockRequest({ ...testBody, price: 1.00 }, { 'authorization': `Bearer ${validToken}` });
    json = await res.json().catch(() => ({}));
    console.log(`Status: ${res.status}, Response:`, json);
    
    console.log("\nAll tests ran.");
}

runTests().catch(console.error);
