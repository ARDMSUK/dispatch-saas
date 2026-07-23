import fetch from 'node-fetch';
import { PrismaClient } from '@prisma/client';
import { SignJWT } from 'jose';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const prisma = new PrismaClient();

async function run() {
    console.log("1. Creating web booking...");
    const bookReq = await fetch('https://app.cabai.co.uk/api/booker/bourneend/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            passengerName: 'TEST 20F WEB CASH FINAL',
            passengerEmail: 'ar.uk@me.com',
            passengerPhone: '07970586381',
            pickup: '53 The Green, Wooburn Green, High Wycombe, UK',
            dropoff: '14 The Parade, Wooburn Green, Bourne End, UK',
            pickupLat: 51.5833, pickupLng: -0.6833,
            dropoffLat: 51.5794, dropoffLng: -0.7107,
            distanceMiles: 2.5,
            notes: 'TEST 20F WEB CASH FINAL — INTERNAL REGRESSION [NO_NOTIFICATIONS]',
            paymentType: 'CASH',
            vehicleType: 'Saloon'
        })
    });
    const bookRes = await bookReq.json();
    console.log("Book result:", bookRes);

    const bookingId = bookRes.id || bookRes.bookingId || bookRes.jobId;
    if (!bookingId) {
        console.log("Could not find booking ID in response. Fetching latest job manually...");
    }

    // Fetch latest job
    const job = await prisma.job.findFirst({
        orderBy: { createdAt: 'desc' },
        where: { passengerName: 'TEST 20F WEB CASH FINAL' },
        include: { tenant: true }
    });

    if (!job) throw new Error("Job not found in DB.");
    console.log("\n2. Initial Job State:");
    console.log("Job ID:", job.id);
    console.log("Status:", job.status);
    console.log("driverId:", job.driverId);
    console.log("autoDispatch:", job.autoDispatch);
    console.log("paymentStatus:", job.paymentStatus);
    console.log("paymentType:", job.paymentType);
    console.log("stripeSessionId:", job.stripeSessionId);

    // 5. Manually assign Driver 38
    console.log("\n3. Manually assigning Driver 38...");
    const driver = await prisma.driver.findFirst({
        where: { callsign: '38' } // or use the provided cmotmmref0001gpsg8a1ju85m
    });
    console.log("Driver found:", driver.id);
    
    await prisma.job.update({
        where: { id: job.id },
        data: { 
            driverId: driver.id,
            status: 'ACCEPTED' // skipping pending->accepted for brevity, or just set it
        }
    });

    await prisma.driver.update({
        where: { id: driver.id },
        data: { status: 'ON_JOB' }
    });

    // 6. Driver accepts & progresses
    // Generate token
    const secret = new TextEncoder().encode(process.env.AUTH_SECRET);
    const token = await new SignJWT({
        driverId: driver.id,
        tenantId: job.tenantId,
        name: driver.name,
        callsign: driver.callsign
    })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret);

    console.log("Driver token generated.");

    async function sendStatus(status, extraData = {}) {
        console.log(`Sending ${status}...`);
        const res = await fetch(`https://app.cabai.co.uk/api/driver/jobs/${job.id}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ status, ...extraData })
        });
        const json = await res.json();
        console.log(`Result ${status}:`, res.status, json);
    }

    await sendStatus('EN_ROUTE');
    await sendStatus('ARRIVED');
    await sendStatus('POB');
    await sendStatus('COMPLETED', { paymentType: 'CASH' });

    // Verify final state
    const finalJob = await prisma.job.findUnique({ where: { id: job.id } });
    const finalDriver = await prisma.driver.findUnique({ where: { id: driver.id } });

    console.log("\n--- FINAL STATE ---");
    console.log("Job status:", finalJob.status);
    console.log("paymentStatus:", finalJob.paymentStatus);
    console.log("driverId:", finalJob.driverId);
    console.log("stripePaymentIntentId:", finalJob.stripePaymentIntentId);
    console.log("Driver status:", finalDriver.status);
}

run().catch(console.error).finally(() => prisma.$disconnect());
