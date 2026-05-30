import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log("--- STARTING TEST: CALL RECORDING INGESTION (YAY.COM & HEURISTIC LINKER) ---");

    // 1. Get a tenant
    const tenant = await prisma.tenant.findFirst();
    if (!tenant || !tenant.apiKey) {
        throw new Error("No tenant or tenant API Key found in database.");
    }
    console.log(`Using Tenant: ${tenant.name} (${tenant.id}), API Key: ${tenant.apiKey}`);

    const testPhone = "+447700911223";
    const cleanPhone = "447700911223";
    const recordingUrl = "https://example.com/recordings/call_123.mp3";
    const duration = 125;

    // Clean up any stale test calls/jobs
    await prisma.incomingCall.deleteMany({
        where: { phone: cleanPhone }
    });

    // A. Step 1: Simulate Incoming Ringing Call
    console.log("\n[1] Simulating incoming ringing call from:", testPhone);
    const ringUrl = `http://localhost:3000/api/external/webhooks/calls?apiKey=${tenant.apiKey}&phone=${encodeURIComponent(testPhone)}&event=ringing`;
    const ringRes = await fetch(ringUrl, { method: 'POST' });
    console.log("Ringing Webhook Response Status:", ringRes.status);
    const ringData = await ringRes.json() as any;
    console.log("Ringing Webhook Response Body:", ringData);

    if (ringRes.status !== 201 || !ringData.success || !ringData.callId) {
        throw new Error("Ringing simulation failed.");
    }
    const callId = ringData.callId;

    // Verify call record is in DB with status RINGING
    let callRecord = await prisma.incomingCall.findUnique({ where: { id: callId } });
    if (!callRecord || callRecord.status !== 'RINGING') {
        throw new Error(`Call record ${callId} was not created as RINGING in DB.`);
    }
    console.log("✅ Ringing call verified in DB:", callRecord);

    // B. Step 2: Simulate operator answering call
    console.log("\n[2] Simulating operator answering call...");
    const answerUrl = `http://localhost:3000/api/external/webhooks/calls?apiKey=${tenant.apiKey}&phone=${encodeURIComponent(testPhone)}&event=answered&answered_by=101`;
    const answerRes = await fetch(answerUrl, { method: 'POST' });
    console.log("Answer Webhook Response Status:", answerRes.status);
    const answerData = await answerRes.json() as any;
    console.log("Answer Webhook Response Body:", answerData);

    callRecord = await prisma.incomingCall.findUnique({ where: { id: callId } });
    if (!callRecord || callRecord.status !== 'ANSWERED' || callRecord.answeredByExt !== '101') {
        throw new Error(`Call record status was not updated to ANSWERED or extension was wrong in DB. Got: ${JSON.stringify(callRecord)}`);
    }
    console.log("✅ Call answering verified in DB:", callRecord);

    // C. Step 3: Simulate operator hanging up call (Yay.com hungup webhook)
    console.log("\n[3] Simulating hungup call with recording URL and duration...");
    const hangupUrl = `http://localhost:3000/api/external/webhooks/calls?apiKey=${tenant.apiKey}&phone=${encodeURIComponent(testPhone)}&event=hungup&recording=${encodeURIComponent(recordingUrl)}&duration=${duration}`;
    const hangupRes = await fetch(hangupUrl, { method: 'POST' });
    console.log("Hangup Webhook Response Status:", hangupRes.status);
    const hangupData = await hangupRes.json() as any;
    console.log("Hangup Webhook Response Body:", hangupData);

    callRecord = await prisma.incomingCall.findUnique({ where: { id: callId } });
    if (!callRecord) {
        throw new Error("Call record not found after hangup.");
    }
    if (callRecord.recordingUrl !== recordingUrl || callRecord.duration !== duration) {
        throw new Error(`Recording URL or duration were not stored correctly. Got: ${JSON.stringify(callRecord)}`);
    }
    // Answered call should stay ANSWERED (not change to DISMISSED)
    if (callRecord.status !== 'ANSWERED') {
        throw new Error(`Answered call status was changed unexpectedly: ${callRecord.status}`);
    }
    console.log("✅ Call hangup, recording url and duration verified in DB:", callRecord);

    // D. Step 4: Create a job for the same caller to trigger the heuristic matching logic
    console.log("\n[4] Creating a booking for passenger phone:", testPhone);
    const createBookingRes = await fetch(`http://localhost:3000/api/booking`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            tenantSlug: tenant.slug,
            passengerName: "Test Call Recording Passenger",
            passengerPhone: testPhone,
            pickupAddress: "10 Downing Street, London",
            dropoffAddress: "Heathrow Airport Terminal 2",
            pickupTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
            vehicleType: "Saloon"
        })
    });
    console.log("Create Booking Response Status:", createBookingRes.status);
    const bookingJson = await createBookingRes.json() as any;
    console.log("Create Booking Response Body:", bookingJson);

    if (createBookingRes.status !== 200 || !bookingJson.success || !bookingJson.jobId) {
        throw new Error("Job creation failed.");
    }
    const jobId = bookingJson.jobId;

    // Verify call record is now linked to the newly created job
    callRecord = await prisma.incomingCall.findUnique({ where: { id: callId } });
    if (!callRecord || callRecord.bookingId !== jobId) {
        throw new Error(`Call record was not linked to Job ID ${jobId}. Got callRecord: ${JSON.stringify(callRecord)}`);
    }
    console.log("✅ Heuristic matching verified! Call is linked to Job ID:", callRecord.bookingId);

    // Clean up
    console.log("\n[5] Cleaning up test data...");
    await prisma.incomingCall.delete({ where: { id: callId } });
    await prisma.job.delete({ where: { id: jobId } });
    console.log("✅ Cleanup complete!");
    console.log("\n--- TEST COMPLETED SUCCESSFULLY ---");
}

main().catch(err => {
    console.error("❌ Test Failed:", err);
    process.exit(1);
}).finally(async () => {
    await prisma.$disconnect();
});
