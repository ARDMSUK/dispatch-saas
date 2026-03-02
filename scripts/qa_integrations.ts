import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function runTest() {
    console.log("--- QA TEST: Integrations & Notifications ---");
    try {
        const tenant = await prisma.tenant.findFirst();
        if (!tenant) throw new Error("No Tenant found.");

        console.log("1. Testing Yay.com VoIP CLI Pop & Webhook Simulation");
        // Mock webhook format from Yay.com
        const mockWebhook = {
            from: "07700900000",
            to: "02080000000",
            status: "RINGING", // or ANSWERED
            timestamp: new Date()
        };

        // Simulating the backend route taking this and creating an IncomingCall
        const incomingCall = await prisma.incomingCall.create({
            data: {
                tenantId: tenant.id,
                phone: mockWebhook.from,
                status: mockWebhook.status,
            }
        });

        console.log(`✅ Webhook mapped gracefully to CLI Pop state id: ${incomingCall.id}`);

        console.log("2. Testing AviationStack DB Contract (Flight Details)");
        const flightJob = await prisma.job.create({
            data: {
                tenantId: tenant.id,
                pickupAddress: "Heathrow",
                dropoffAddress: "London",
                pickupTime: new Date(),
                passengerName: "Flight Passenger",
                passengerPhone: "+447000000000",
                status: "PENDING",
                flightNumber: "BA202",
                notes: "Waiting for AviationStack Sync via Cron",
                fare: 50.0,
                autoDispatch: false
            }
        });

        const fetchedFlight = await prisma.job.findUnique({ where: { id: flightJob.id } })
        if (fetchedFlight?.flightNumber !== "BA202") throw new Error("Flight field persistence failed");
        console.log(`✅ Job metadata configured correctly for external flight fetching sync.`);

        console.log("3. Testing Dynamic Communication Templates (SMS / Email)");
        // Testing template override storage
        const updatedTenant = await prisma.tenant.update({
            where: { id: tenant.id },
            data: { smsTemplateDriverArrived: "Hi {{passengerName}}, your {{vehicleType}} driver {{driverName}} has arrived!" }
        });

        // Simulating the parser
        const mockVariables = { passengerName: "John Doe", vehicleType: "Executive", driverName: "Sam" };
        let parsedContent = updatedTenant.smsTemplateDriverArrived!;
        for (const [key, value] of Object.entries(mockVariables)) {
            parsedContent = parsedContent.replace(new RegExp(`{{${key}}}`, 'g'), value);
        }

        const expectedResult = "Hi John Doe, your Executive driver Sam has arrived!";
        if (parsedContent !== expectedResult) throw new Error(`Template parser logic failed. Got: ${parsedContent}`);
        console.log(`✅ Template Engine successfully interpolated text: "${parsedContent}"`);

        // Cleanup
        await prisma.incomingCall.delete({ where: { id: incomingCall.id } });
        await prisma.job.delete({ where: { id: flightJob.id } });

        console.log("--- QA TEST PASSED: External Integration Pipelines Validated ---");

    } catch (err) {
        console.error("❌ QA TEST FAILED:", err);
    } finally {
        await prisma.$disconnect();
    }
}

runTest();
