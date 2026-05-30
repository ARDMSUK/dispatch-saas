import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testVoiceAi() {
    console.log("--- STARTING VOICE AI WEBHOOK TESTS ---");

    // 1. Get a valid tenant and ensure pricing exists
    const tenant = await prisma.tenant.findFirst();
    if (!tenant) {
        throw new Error("No tenant found. Run setup first.");
    }
    console.log(`Using Tenant: ${tenant.name} (${tenant.id})`);

    const voiceApiUrl = `http://localhost:3000/api/voice/bookings?tenantId=${tenant.id}`;

    // A. TEST calculate_quote
    console.log("\n[A] Testing 'calculate_quote' tool call...");
    const quotePayload = {
        message: {
            type: "tool-calls",
            toolCalls: [
                {
                    id: "call_quote_123",
                    type: "function",
                    function: {
                        name: "calculate_quote",
                        arguments: JSON.stringify({
                            pickupLocation: "Heathrow Airport Terminal 2",
                            dropoffLocation: "10 Downing Street, London",
                            pickupTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
                            vehicleType: "Saloon"
                        })
                    }
                }
            ]
        }
    };

    const quoteRes = await fetch(voiceApiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(quotePayload)
    });

    console.log("Quote Response Status:", quoteRes.status);
    const quoteData = await quoteRes.json();
    console.log("Quote Response Body:", JSON.stringify(quoteData, null, 2));

    if (quoteRes.status !== 200 || !quoteData.results || quoteData.results.length === 0 || !quoteData.results[0].result.includes("estimated price")) {
        throw new Error("calculate_quote test failed.");
    }
    console.log("✅ calculate_quote test passed!");

    // B. TEST lookup_faq
    console.log("\n[B] Testing 'lookup_faq' tool call...");
    // Let's seed a test FAQ first
    const faq = await prisma.tenantFaq.create({
        data: {
            tenantId: tenant.id,
            question: "Do you have booster seats for infants?",
            answer: "Yes, we provide booster and child car seats on request. Please specify the age of the child when booking."
        }
    });

    const faqPayload = {
        message: {
            type: "tool-calls",
            toolCalls: [
                {
                    id: "call_faq_123",
                    type: "function",
                    function: {
                        name: "lookup_faq",
                        arguments: JSON.stringify({
                            query: "booster seat"
                        })
                    }
                }
            ]
        }
    };

    const faqRes = await fetch(voiceApiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(faqPayload)
    });

    console.log("FAQ Response Status:", faqRes.status);
    const faqData = await faqRes.json();
    console.log("FAQ Response Body:", JSON.stringify(faqData, null, 2));

    // Cleanup the seeded FAQ
    await prisma.tenantFaq.delete({ where: { id: faq.id } });

    if (faqRes.status !== 200 || !faqData.results || faqData.results.length === 0 || !faqData.results[0].result.includes("booster and child car seats")) {
        throw new Error("lookup_faq test failed.");
    }
    console.log("✅ lookup_faq test passed!");

    // C. TEST create_booking
    console.log("\n[C] Testing 'create_booking' tool call...");
    const bookingPayload = {
        message: {
            type: "tool-calls",
            toolCalls: [
                {
                    id: "call_booking_123",
                    type: "function",
                    function: {
                        name: "create_booking",
                        arguments: JSON.stringify({
                            passengerName: "John Voice",
                            passengerPhone: "+447888888888",
                            passengerEmail: "john.voice@example.com",
                            pickupLocation: "Heathrow Airport Terminal 2",
                            dropoffLocation: "10 Downing Street, London",
                            pickupTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                            passengers: 2,
                            luggage: 2,
                            vehicleType: "Saloon",
                            isReturn: false,
                            fare: 45.50
                        })
                    }
                }
            ]
        }
    };

    const bookingRes = await fetch(voiceApiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookingPayload)
    });

    console.log("Booking Response Status:", bookingRes.status);
    const bookingData = await bookingRes.json();
    console.log("Booking Response Body:", JSON.stringify(bookingData, null, 2));

    if (bookingRes.status !== 200 || !bookingData.results || bookingData.results.length === 0 || !bookingData.results[0].result.includes("Booking created successfully")) {
        throw new Error("create_booking test failed.");
    }

    // Extract the booking ID from the response result to clean it up
    const match = bookingData.results[0].result.match(/reference number is (\w+)/);
    if (match && match[1]) {
        const jobId = parseInt(match[1]);
        if (!isNaN(jobId)) {
            console.log(`Cleaning up created Job ID: ${jobId}`);
            await prisma.job.delete({ where: { id: jobId } });
        }
    }

    console.log("✅ create_booking test passed!");
    console.log("\n--- VOICE AI WEBHOOK TESTS COMPLETED SUCCESSFULLY ---");
}

testVoiceAi()
    .catch(err => {
        console.error("Test execution failed:", err);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
