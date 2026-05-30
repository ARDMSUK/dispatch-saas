import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log("--- STARTING TEST: VAPI RECORDING INGESTION & BOOKING ASSOCIATION ---");

    // 1. Get a tenant
    const tenant = await prisma.tenant.findFirst();
    if (!tenant) {
        throw new Error("No tenant found.");
    }
    console.log(`Using Tenant: ${tenant.name} (${tenant.id})`);

    // Store original settings to restore later
    const originalHasVoiceAi = tenant.hasVoiceAi;
    const originalEnableVoiceAi = tenant.enableVoiceAi;

    // Temporarily unlock and enable Voice AI on the tenant for the test run
    await prisma.tenant.update({
        where: { id: tenant.id },
        data: {
            hasVoiceAi: true,
            enableVoiceAi: true
        }
    });

    const testPhone = "+447700999999";
    const voiceApiUrl = `http://localhost:3000/api/voice/bookings?tenantId=${tenant.id}`;

    // Clean up any stale test calls/jobs
    await prisma.incomingCall.deleteMany({
        where: { phone: testPhone }
    });

    let jobId: number | null = null;

    try {
        // Step 1: Create a test booking
        console.log("\n[1] Creating a test booking via API...");
        const createBookingRes = await fetch(`http://localhost:3000/api/booking`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                tenantSlug: tenant.slug,
                passengerName: "Vapi AI Test Passenger",
                passengerPhone: testPhone,
                pickupAddress: "Heathrow Airport Terminal 2",
                dropoffAddress: "10 Downing Street, London",
                pickupTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                vehicleType: "Saloon"
            })
        });

        const bookingJson = await createBookingRes.json() as any;
        console.log("Create Booking Response Status:", createBookingRes.status);
        console.log("Create Booking Response Body:", bookingJson);

        if (createBookingRes.status !== 200 || !bookingJson.success || !bookingJson.jobId) {
            throw new Error("Job creation failed.");
        }
        jobId = bookingJson.jobId;

        // Step 2: Simulate Vapi sending end-of-call-report
        console.log("\n[2] Simulating Vapi sending end-of-call-report...");
        const vapiPayload = {
            message: {
                type: "end-of-call-report",
                call: {
                    id: "vapi-call-12345",
                    duration: 52.3,
                    recordingUrl: "https://example.com/recordings/vapi-call-555.mp3",
                    transcript: "Hello, I would like to book a taxi from Heathrow to Downing Street please. Thank you.",
                    summary: "Passenger booked a taxi from Heathrow Airport to 10 Downing Street.",
                    customer: {
                        number: testPhone
                    }
                }
            }
        };

        const vapiRes = await fetch(voiceApiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(vapiPayload)
        });

        console.log("Vapi Report Webhook Response Status:", vapiRes.status);
        const vapiResult = await vapiRes.json() as any;
        console.log("Vapi Report Webhook Response Body:", vapiResult);

        if (vapiRes.status !== 200 || !vapiResult.success || !vapiResult.callId) {
            throw new Error(`Vapi webhook failed with response: ${JSON.stringify(vapiResult)}`);
        }
        const callId = vapiResult.callId;

        // Step 3: Verify the call record was created and correctly linked to the booking
        console.log("\n[3] Verifying Voice AI call log and booking linkage in DB...");
        const callRecord = await prisma.incomingCall.findUnique({
            where: { id: callId }
        });

        if (!callRecord) {
            throw new Error(`Call record ${callId} was not created in database.`);
        }

        console.log("Found DB Call Record:", callRecord);

        if (callRecord.status !== 'ANSWERED') {
            throw new Error(`Expected status 'ANSWERED', got: ${callRecord.status}`);
        }
        if (callRecord.answeredByExt !== 'Voice AI') {
            throw new Error(`Expected answeredByExt 'Voice AI', got: ${callRecord.answeredByExt}`);
        }
        if (callRecord.recordingUrl !== "https://example.com/recordings/vapi-call-555.mp3") {
            throw new Error(`Expected recordingUrl 'https://example.com/recordings/vapi-call-555.mp3', got: ${callRecord.recordingUrl}`);
        }
        if (callRecord.duration !== 52) { // 52.3 rounded to 52
            throw new Error(`Expected duration 52, got: ${callRecord.duration}`);
        }
        if (callRecord.bookingId !== jobId) {
            throw new Error(`Expected bookingId linked to ${jobId}, got: ${callRecord.bookingId}`);
        }
        if (!callRecord.transcript?.includes("Heathrow to Downing Street")) {
            throw new Error("Transcript was not saved correctly.");
        }
        if (!callRecord.summary?.includes("Heathrow Airport to 10 Downing Street")) {
            throw new Error("Summary was not saved correctly.");
        }

        console.log("✅ Vapi Recording Ingestion and Booking Association successfully verified!");

    } finally {
        console.log("\n[4] Cleaning up test data & restoring tenant settings...");
        // Clean up created entities
        if (jobId) {
            try {
                await prisma.job.delete({ where: { id: jobId } });
            } catch (e) {
                console.error("Failed to delete job", e);
            }
        }
        try {
            await prisma.incomingCall.deleteMany({
                where: { phone: testPhone }
            });
        } catch (e) {
            console.error("Failed to delete incoming calls", e);
        }

        // Restore settings
        await prisma.tenant.update({
            where: { id: tenant.id },
            data: {
                hasVoiceAi: originalHasVoiceAi,
                enableVoiceAi: originalEnableVoiceAi
            }
        });
        console.log("✅ Cleanup and restoration complete!");
    }

    console.log("\n--- VAPI VOICE AI TEST COMPLETED SUCCESSFULLY ---");
}

main().catch(err => {
    console.error("❌ Test Failed:", err);
    process.exit(1);
}).finally(async () => {
    await prisma.$disconnect();
});
