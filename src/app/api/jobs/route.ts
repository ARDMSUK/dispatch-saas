/* eslint-disable */
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { calculatePrice } from '@/lib/pricing';
import { auth } from "@/auth";
import { EmailService } from '@/lib/email-service';
import { SmsService } from '@/lib/sms-service';
import { DispatchEngine } from '@/lib/dispatch-engine';

export const dynamic = 'force-dynamic';

// GET /api/jobs
export async function GET(req: Request) {
    try {
        const session = await auth();
        if (!session?.user?.tenantId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const tenantId = session.user.tenantId;

        const { searchParams } = new URL(req.url);
        const status = searchParams.get('status'); // Optional filter

        try {
            // Run Smart Dispatch Engine
            // This will respect the autoDispatch flag inside
            await DispatchEngine.runDispatchLoop(tenantId);
        } catch (e) {
            console.error("Auto-dispatch check failed", e);
        }
        // ---------------------------

        const jobs = await prisma.job.findMany({
            where: {
                tenantId,
                ...(status ? { status: status.toUpperCase() } : {})
            },
            include: {
                customer: true,
                driver: true,
                preAssignedDriver: true
            },
            orderBy: { pickupTime: 'desc' },
            take: 50
        });

        // Map to frontend shape
        const mappedJobs = jobs.map(j => ({
            id: j.id,
            pickupAddress: j.pickupAddress,
            dropoffAddress: j.dropoffAddress,
            passengerName: j.passengerName || j.customer?.name || "Unknown",
            passengerPhone: j.passengerPhone || j.customer?.phone || "Unknown",
            pickupTime: j.pickupTime.toISOString(),
            fare: j.fare,
            status: j.status,
            paymentType: j.paymentType,
            driver: j.driver ? {
                id: j.driver.id,
                name: j.driver.name,
                callsign: j.driver.callsign,
                phone: j.driver.phone
            } : null,
            preAssignedDriver: j.preAssignedDriver ? {
                id: j.preAssignedDriver.id,
                name: j.preAssignedDriver.name,
                callsign: j.preAssignedDriver.callsign
            } : null,
            passengers: j.passengers,
            luggage: j.luggage,
            vehicleType: j.vehicleType,
            notes: j.notes,
            flightNumber: j.flightNumber,
            returnBooking: j.isReturn,
            source: 'WEB'
        }));

        return NextResponse.json(mappedJobs);
    } catch (error) {
        console.error('Error fetching jobs:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

// POST /api/jobs
export async function POST(request: Request) {
    try {
        const session = await auth();
        if (!session?.user?.tenantId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const tenantId = session.user.tenantId;
        const body = await request.json();


        // 1. Find or Create Customer
        let customerId: string | undefined = body.customerId;

        if (!customerId && body.passengerPhone) {
            // Check if exists
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

        // 2. Pricing & Timing
        let fare = body.fare ? parseFloat(body.fare) : null;
        let finalPickupTime = body.pickupTime ? new Date(body.pickupTime) : new Date();

        if ((!fare || fare === 0) && body.pickupAddress && body.dropoffAddress) {
            const pricingResult = await calculatePrice({
                pickup: body.pickupAddress,
                dropoff: body.dropoffAddress,
                pickupTime: finalPickupTime,
                companyId: tenantId,
                pickupLat: body.pickupLat,
                pickupLng: body.pickupLng,
                dropoffLat: body.dropoffLat,
                dropoffLng: body.dropoffLng
            });
            fare = pricingResult.price;
            console.log('[API/jobs] Server calculated fare:', fare);
        }

        // 3. Prepare Common Job Data
        const commonJobData = {
            tenantId,
            customerId,
            passengerName: body.passengerName || "Unknown",
            passengerPhone: body.passengerPhone || "Unknown",
            passengers: body.passengers ? parseInt(body.passengers) : 1,
            luggage: body.luggage ? parseInt(body.luggage) : 0,
            vehicleType: body.vehicleType || 'Saloon',
            flightNumber: body.flightNumber || null,
            vias: body.vias || undefined, // JSON
            paymentType: body.paymentType || 'CASH',
            notes: body.notes || null,
            isFixedPrice: false,
            status: 'PENDING',
            // Coordinates
            pickupLat: body.pickupLat || null,
            pickupLng: body.pickupLng || null,
            dropoffLat: body.dropoffLat || null,
            dropoffLng: body.dropoffLng || null,
            autoDispatch: body.autoDispatch !== undefined ? body.autoDispatch : true
        };

        // 5. Build Job Data List (Handle Recurrence)
        const jobsToCreate = [];
        const recurrenceGroupId = body.isRecurring ? crypto.randomUUID() : null;

        if (body.isRecurring && body.recurrenceRule && body.recurrenceEnd) {
            const endDate = new Date(body.recurrenceEnd);
            let currentDate = new Date(finalPickupTime);
            const limitDate = new Date();
            limitDate.setDate(limitDate.getDate() + 28); // Max 4 weeks ahead for now

            // Safety clamp
            const actualEndDate = endDate > limitDate ? limitDate : endDate;

            // Loop day by day
            let safetyCounter = 0;
            while (currentDate <= actualEndDate && safetyCounter < 50) {
                let shouldCreate = false;
                const dayOfWeek = currentDate.getDay(); // 0=Sun, 1=Mon...

                if (body.recurrenceRule === 'DAILY') {
                    shouldCreate = true;
                } else if (body.recurrenceRule === 'WEEKLY') {
                    // Only if day of week matches original
                    if (currentDate.getDay() === finalPickupTime.getDay()) shouldCreate = true;
                } else if (body.recurrenceRule === 'MON-FRI') {
                    if (dayOfWeek >= 1 && dayOfWeek <= 5) shouldCreate = true;
                } else if (body.recurrenceRule === 'MON,WED,FRI') {
                    if (dayOfWeek === 1 || dayOfWeek === 3 || dayOfWeek === 5) shouldCreate = true;
                }

                // If it's the first one, we always create it (it matches start date)
                // Actually, let's just use the loop logic. 
                // Ensure the first job (start date) is included
                if (currentDate.getTime() === finalPickupTime.getTime()) shouldCreate = true;

                if (shouldCreate) {
                    jobsToCreate.push({
                        ...commonJobData,
                        pickupAddress: body.pickupAddress,
                        dropoffAddress: body.dropoffAddress,
                        pickupTime: new Date(currentDate),
                        fare: fare, // Assuming fixed price/estimate stays same
                        isReturn: false,
                        isRecurring: true,
                        recurrenceRule: body.recurrenceRule,
                        recurrenceGroupId: recurrenceGroupId,
                        recurrenceEnd: new Date(body.recurrenceEnd),
                        // Wait & Return Fields
                        waitingTime: body.isWaitAndReturn ? (body.waitingTime || 0) : 0,
                        waitingCost: 0 // Calculated later or ignored for now
                    });
                }

                // Advance 1 day
                currentDate.setDate(currentDate.getDate() + 1);
                safetyCounter++;
            }

        } else {
            // Single Job
            jobsToCreate.push({
                ...commonJobData,
                pickupAddress: body.pickupAddress,
                dropoffAddress: body.dropoffAddress,
                pickupTime: finalPickupTime,
                fare: fare,
                isReturn: false,
                // Wait & Return Fields
                waitingTime: body.isWaitAndReturn ? (body.waitingTime || 0) : 0,
                waitingCost: 0
            });
        }

        // 6. Execute Creations
        let firstJob = null;
        let createdCount = 0;


        for (const jobData of jobsToCreate) {
            const job = await prisma.job.create({ data: jobData });
            if (!firstJob) firstJob = job;
            createdCount++;
        }

        const newJob = firstJob; // For backward compatibility with return logic

        // 7. Create Return Job if requested (Only for Single Job scenarios)
        let returnJob = null;
        if (!body.isRecurring && body.returnBooking && body.returnDate) {
            // Calculate Return Fare
            let returnFare = fare;

            // Return Time
            const returnTime = new Date(body.returnDate);

            returnJob = await prisma.job.create({
                data: {
                    ...commonJobData,
                    pickupAddress: body.dropoffAddress, // Swap
                    dropoffAddress: body.pickupAddress, // Swap
                    pickupTime: returnTime,
                    fare: returnFare,
                    isReturn: true,
                    parentJobId: newJob!.id
                }
            });
        }

        // 6. Send Confirmation Email (Async, don't block response)
        const jobWithDetails = { ...newJob, passengerEmail: body.passengerEmail };

        const tenantSettings = await prisma.tenant.findUnique({ where: { id: tenantId } });

        // Notifications: Email & SMS
        const notificationPromises = [
            EmailService.sendBookingConfirmation(jobWithDetails as any, tenantSettings).catch(e => console.error("Failed to send email", e))
        ];

        // NEW: Payment Confirmation
        if (body.paymentType === 'CARD' && body.stripePaymentIntentId) {
            notificationPromises.push(
                EmailService.sendPaymentConfirmation(jobWithDetails as any, tenantSettings).catch(e => console.error("Failed to send payment receipt", e))
            );
        }

        if (body.passengerPhone) {
            notificationPromises.push(
                SmsService.sendBookingConfirmation(newJob as any, tenantSettings).catch(e => console.error("Failed to send SMS", e))
            );
        }



        if (returnJob) {
            const returnJobWithDetails = { ...returnJob, passengerEmail: body.passengerEmail };
            notificationPromises.push(EmailService.sendBookingConfirmation(returnJobWithDetails as any, tenantSettings).catch(e => console.error("Failed to send return email", e)));

            // NEW: Payment Confirmation for Return Job
            if (body.paymentType === 'CARD' && body.stripePaymentIntentId) {
                notificationPromises.push(
                    EmailService.sendPaymentConfirmation(returnJobWithDetails as any, tenantSettings).catch(e => console.error("Failed to send return payment receipt", e))
                );
            }

            if (body.passengerPhone) {
                notificationPromises.push(SmsService.sendBookingConfirmation(returnJob as any, tenantSettings).catch(e => console.error("Failed to send return SMS", e)));
            }
        }

        // Wait for all notifications (don't block response on failures)
        await Promise.allSettled(notificationPromises);

        // 7. Trigger Auto-Dispatch (Async)
        DispatchEngine.runDispatchLoop(tenantId).catch(err => console.error("Post-creation dispatch failed", err));

        return NextResponse.json({ job: newJob, returnJob }, { status: 201 });

    } catch (error) {
        console.error('Error creating job:', error);
        return NextResponse.json({
            error: 'Internal Server Error',
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
}
