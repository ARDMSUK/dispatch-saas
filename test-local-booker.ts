import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function run() {
    console.log("1. Creating web booking via localhost API...");
    // We assume the app is running locally on port 3000
    const bookReq = await fetch('http://localhost:3000/api/booker/bourneend/book', {
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
            notes: 'TEST 20F WEB CASH FINAL — INTERNAL REGRESSION',
            paymentType: 'CASH',
            vehicleType: 'Saloon',
            turnstileToken: '1x00000000000000000000AA' // Bypasses check in dev
        })
    });
    
    const textRes = await bookReq.text();
    console.log("Book result raw:", textRes);
}
run().catch(console.error);
