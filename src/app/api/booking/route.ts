
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { calculatePrice } from '@/lib/pricing';
import { EmailService } from '@/lib/email-service';
import { SmsService } from '@/lib/sms-service';
import { DispatchEngine } from '@/lib/dispatch-engine';

// POST /api/booking (Public)
export async function POST(req: Request) {
    try {
        const body = await req.json();

        // Hardcoded for MVP: 'zercabs'
        // In a real multi-tenant public app, we'd infer this from the domain or a hidden field.
        const tenantSlug = 'zercabs';
        const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });

        if (!tenant) {
            return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
        }

        const tenantId = tenant.id;

        // 1. Validate / Find Customer
        // Public booking = we trust the phone number provided or we create a new customer key?
        // Let's match by Phone/Email if exists, else create.

        let customerId = null;

        if (body.passengerPhone) {
            const existingCust = await prisma.customer.findFirst({
                where: {
                    tenantId,
                    phone: body.passengerPhone
                }
            });

            if (existingCust) {
                customerId = existingCust.id;
            } else {
                const newCust = await prisma.customer.create({
                    data: {
                        tenantId,
                        phone: body.passengerPhone,
                        name: body.passengerName || "Unknown",
                        email: body.passengerEmail || null,
                    }
                });
                customerId = newCust.id;
            }
        }

        // 2. Re-Calculate Price (Security)
        // Never trust client-side price
        const pricingResult = await calculatePrice({
            pickup: body.pickupAddress,
            dropoff: body.dropoffAddress,
            vias: body.vias,
            pickupTime: new Date(body.pickupTime),
            vehicleType: body.vehicleType,
            companyId: tenantId,
            pickupLat: body.pickupLat,
            pickupLng: body.pickupLng,
            dropoffLat: body.dropoffLat,
            dropoffLng: body.dropoffLng,
            // Wait & Return
            waitingTime: body.waitingTime,
            isWaitAndReturn: body.isWaitAndReturn
        });

        const finalFare = pricingResult.price;

        // 3. Create Job
        const job = await prisma.job.create({
            data: {
                tenantId,
                customerId,
                pickupAddress: body.pickupAddress,
                dropoffAddress: body.dropoffAddress,
                pickupLat: body.pickupLat,
                pickupLng: body.pickupLng,
                dropoffLat: body.dropoffLat,
                dropoffLng: body.dropoffLng,
                pickupTime: new Date(body.pickupTime),
                passengerName: body.passengerName,
                passengerPhone: body.passengerPhone,
                // passengerEmail not in Job model
                passengers: parseInt(body.passengers || '1'),
                luggage: parseInt(body.luggage || '0'),
                vehicleType: body.vehicleType,
                flightNumber: body.flightNumber,
                notes: body.notes,
                paymentType: body.paymentType || 'CASH',
                fare: finalFare,
                status: 'PENDING',
                // source: 'WEB_PUBLIC', // Not in schema yet
                // Wait & Return
                waitingTime: body.waitingTime,
                isReturn: false // Explicitly false for the main job
            }
        });

        // 4. Handle Return Job
        let returnJob = null;
        if (body.returnBooking && body.returnDate) {
            // Return Price might be same or different (e.g. night rates)
            // For simplicity using same price logic
            const returnPricing = await calculatePrice({
                pickup: body.dropoffAddress, // Swap
                dropoff: body.pickupAddress, // Swap
                pickupTime: new Date(body.returnDate),
                vehicleType: body.vehicleType,
                companyId: tenantId,
                pickupLat: body.dropoffLat,
                pickupLng: body.dropoffLng,
                dropoffLat: body.pickupLat,
                dropoffLng: body.pickupLng
            });

            returnJob = await prisma.job.create({
                data: {
                    tenantId,
                    customerId,
                    pickupAddress: body.dropoffAddress,
                    dropoffAddress: body.pickupAddress,
                    pickupLat: body.dropoffLat,
                    pickupLng: body.dropoffLng,
                    dropoffLat: body.pickupLat,
                    dropoffLng: body.pickupLng,
                    pickupTime: new Date(body.returnDate),
                    passengerName: body.passengerName,
                    passengerPhone: body.passengerPhone,
                    // passengerEmail not in Job model
                    passengers: parseInt(body.returnPassengers || body.passengers),
                    luggage: parseInt(body.returnLuggage || body.luggage),
                    vehicleType: body.vehicleType,
                    flightNumber: body.returnFlightNumber,
                    notes: body.returnNotes,
                    paymentType: body.paymentType || 'CASH',
                    fare: returnPricing.price,
                    status: 'PENDING',
                    // source: 'WEB_PUBLIC',
                    isReturn: true,
                    parentJobId: job.id
                }
            });
        }

        // 5. Notifications & Dispatch
        // We do NOT await these to keep UI fast

        const jobWithCustomer = { ...job, customer: { email: body.passengerEmail } };
        EmailService.sendBookingConfirmation(jobWithCustomer as any).catch(e => console.error("Email failed", e));
        SmsService.sendBookingConfirmation(job).catch(e => console.error("SMS failed", e));

        if (returnJob) {
            const returnJobWithCustomer = { ...returnJob, customer: { email: body.passengerEmail } };
            EmailService.sendBookingConfirmation(returnJobWithCustomer as any).catch(e => console.error("Return Email failed", e));
            SmsService.sendBookingConfirmation(returnJob).catch(e => console.error("Return SMS failed", e));
        }

        DispatchEngine.runDispatchLoop(tenantId).catch(e => console.error("Dispatch loop failed", e));

        return NextResponse.json({
            success: true,
            jobId: job.id,
            ref: job.id.toString().slice(-6), // Simple Ref
            returnJobId: returnJob?.id
        });

    } catch (error) {
        console.error("Public Booking Error:", error);
        return NextResponse.json({ error: "Booking Failed" }, { status: 500 });
    }
}
