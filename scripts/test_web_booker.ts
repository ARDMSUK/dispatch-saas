import { prisma } from '../src/lib/prisma';

async function main() {
    // 1. Get a Tenant and ensure Web Booker is ON
    let tenant = await prisma.tenant.findFirst({
        where: { name: 'Test Surge Tenant' }
    });

    if (!tenant) {
        console.log("No test tenant found.");
        return;
    }

    await prisma.tenant.update({
        where: { id: tenant.id },
        data: { enableWebBooker: true }
    });

    console.log(`Testing Public Booker API for slug: ${tenant.slug}`);

    // 2. Simulate hitting the public POST /api/booker/[slug]/quote
    const quotePayload = {
        pickup: '10 Downing St, London',
        dropoff: 'London Eye',
        pickupLat: 51.5033, pickupLng: -0.1275,
        dropoffLat: 51.5033, dropoffLng: -0.1195,
        distanceMiles: 2.5,
        pickupTime: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
        vehicleType: 'Saloon'
    };

    console.log("\n--- Dispatching locally simulated Quote API ---");
    // We import and call the POST handler directly to simulate HTTP without needing Next.js running on a port
    const { POST: QuoteHandler } = await import('../src/app/api/booker/[slug]/quote/route');

    const quoteReq = new Request(`http://localhost/api/booker/${tenant.slug}/quote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(quotePayload)
    });

    const quoteRes = await QuoteHandler(quoteReq, { params: { slug: tenant.slug } });
    const quoteData = await quoteRes.json();

    console.log("Quote Response status:", quoteRes.status);
    console.log("Quote JSON:", JSON.stringify(quoteData, null, 2));


    // 3. Simulate hitting the public POST /api/booker/[slug]/book
    console.log("\n--- Dispatching locally simulated Booking API ---");
    const { POST: BookHandler } = await import('../src/app/api/booker/[slug]/book/route');

    const bookPayload = {
        ...quotePayload,
        passengerName: 'Public Web User',
        passengerPhone: '07700900123',
        passengers: "2",
        notes: "I booked this from the website widget!",
    }

    const bookReq = new Request(`http://localhost/api/booker/${tenant.slug}/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookPayload)
    });

    const bookRes = await BookHandler(bookReq, { params: { slug: tenant.slug } });
    const bookData = await bookRes.json();

    console.log("Book Response status:", bookRes.status);
    console.log("Book JSON:", JSON.stringify(bookData, null, 2));

    if (bookData.jobId) {
        const createdJob = await prisma.job.findUnique({ where: { id: bookData.jobId } });
        console.log("\nCreated Job in Database:", createdJob?.status, "| Fare:", createdJob?.fare);
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
