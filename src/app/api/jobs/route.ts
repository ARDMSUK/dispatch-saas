/* eslint-disable */
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { calculatePrice } from '@/lib/pricing';
import { auth } from "@/auth";
import { EmailService } from '@/lib/email-service';
import { SmsService } from '@/lib/sms-service';
import { DispatchEngine } from '@/lib/dispatch-engine';
import { linkRecentCallToBooking } from '@/lib/call-matching';
import { getStripe } from '@/lib/stripe';

export const dynamic = 'force-dynamic';

// GET /api/jobs
export async function GET(req: Request) {
    try {
        const session = await auth();
        if (!session?.user?.tenantId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        if (session.user.role === 'DRIVER' || session.user.role === 'B2B_ADMIN') {
            return NextResponse.json({ error: "Forbidden: Access denied" }, { status: 403 });
        }
        const tenantId = session.user.tenantId;

        const { searchParams } = new URL(req.url);
        const status = searchParams.get('status'); // Optional filter
        const search = searchParams.get('search'); // Search query

        const cleanedSearch = search ? search.trim().replace(/^#/, '') : '';
        const numericSearch = Number(cleanedSearch);

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
                contractRouteId: null, // Filter out school contract jobs
                ...(status && !search ? { status: status.toUpperCase() } : {}),
                ...(search ? {
                    OR: [
                        { passengerName: { contains: search, mode: 'insensitive' } },
                        { passengerPhone: { contains: search, mode: 'insensitive' } },
                        { pickupAddress: { contains: search, mode: 'insensitive' } },
                        { dropoffAddress: { contains: search, mode: 'insensitive' } },
                        ...(!isNaN(numericSearch) && cleanedSearch !== '' ? [{ id: numericSearch }] : [])
                    ]
                } : {})
            },
            select: {
                id: true,
                pickupAddress: true,
                dropoffAddress: true,
                pickupLat: true,
                pickupLng: true,
                dropoffLat: true,
                dropoffLng: true,
                passengerName: true,
                passengerPhone: true,
                passengerEmail: true,
                pickupTime: true,
                fare: true,
                status: true,
                paymentType: true,
                passengers: true,
                luggage: true,
                vehicleType: true,
                notes: true,
                flightNumber: true,
                isReturn: true,
                waitingTime: true,
                emergencyActive: true,
                bookedAt: true,
                updatedAt: true,
                paymentStatus: true,
                paymentLink: true,
                paymentProvider: true,
                paymentReferenceId: true,
                customer: {
                    select: {
                        name: true,
                        phone: true,
                        email: true
                    }
                },
                bookedBy: {
                    select: {
                        name: true,
                        email: true
                    }
                },
                driver: {
                    select: {
                        id: true,
                        name: true,
                        callsign: true,
                        phone: true
                    }
                },
                preAssignedDriver: {
                    select: {
                        id: true,
                        name: true,
                        callsign: true
                    }
                },
                calls: {
                    select: {
                        id: true,
                        phone: true,
                        status: true,
                        recordingUrl: true,
                        duration: true,
                        createdAt: true,
                        answeredByExt: true,
                        summary: true,
                        transcript: true
                    }
                }
            },
            orderBy: { pickupTime: 'desc' },
            take: search ? 100 : 50
        });

        // Map to frontend shape
        const mappedJobs = jobs.map(j => ({
            id: j.id,
            pickupAddress: j.pickupAddress,
            dropoffAddress: j.dropoffAddress,
            pickupLat: j.pickupLat,
            pickupLng: j.pickupLng,
            dropoffLat: j.dropoffLat,
            dropoffLng: j.dropoffLng,
            passengerName: j.passengerName || j.customer?.name || "Unknown",
            passengerPhone: j.passengerPhone || j.customer?.phone || "Unknown",
            passengerEmail: j.passengerEmail || j.customer?.email || "",
            pickupTime: j.pickupTime.toISOString(),
            fare: j.fare,
            status: j.status,
            paymentType: j.paymentType,
            paymentStatus: j.paymentStatus,
            paymentLink: j.paymentLink,
            paymentProvider: j.paymentProvider,
            paymentReferenceId: j.paymentReferenceId,
            createdAt: j.bookedAt.toISOString(),
            updatedAt: j.updatedAt.toISOString(),
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
            bookedBy: j.bookedBy ? {
                name: j.bookedBy.name,
                email: j.bookedBy.email
            } : null,
            passengers: j.passengers,
            luggage: j.luggage,
            vehicleType: j.vehicleType,
            notes: j.notes,
            flightNumber: j.flightNumber,
            returnBooking: j.isReturn,
            waitingTime: j.waitingTime,
            emergencyActive: j.emergencyActive,
            calls: j.calls || [],
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
        if (session.user.role === 'DRIVER' || session.user.role === 'B2B_ADMIN') {
            return NextResponse.json({ error: "Forbidden: Access denied" }, { status: 403 });
        }
        const tenantId = session.user.tenantId;
        const body = await request.json();


        const tenant = await prisma.tenant.findUnique({
            where: { id: tenantId },
            select: { subscriptionStatus: true }
        });

        if (tenant && (tenant.subscriptionStatus === 'PAST_DUE' || tenant.subscriptionStatus === 'CANCELED')) {
            return NextResponse.json({ error: 'Platform booking is disabled due to a billing issue.' }, { status: 403 });
        }

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

        const isWavType = body.vehicleType ? body.vehicleType.toLowerCase().includes('wav') : false;

        // NEW: Payment Verification
        let verifiedPaymentStatus = 'UNPAID';
        let verifiedPaymentProvider = null;
        let verifiedStripePaymentIntentId = null;
        let verifiedPaymentReferenceId = null;

        if (body.paymentType === 'CARD' && body.stripePaymentIntentId) {
            const tenantSettings = await prisma.tenant.findUnique({ where: { id: tenantId } });
            
            let apiKey = null;

            if (tenantSettings?.stripeSecretKey) {
                apiKey = tenantSettings.stripeSecretKey;
            } else if (process.env.STRIPE_SECRET_KEY) {
                apiKey = process.env.STRIPE_SECRET_KEY;
            }

            if (!apiKey) {
                return NextResponse.json({ error: "Payment configuration missing for this tenant" }, { status: 500 });
            }

            const stripe = getStripe(apiKey);
            
            try {
                const paymentIntent = await stripe.paymentIntents.retrieve(body.stripePaymentIntentId);

                // Verify status
                if (paymentIntent.status !== 'succeeded') {
                    console.error(`Payment verification failed: Payment has not succeeded (${paymentIntent.status})`);
                    return NextResponse.json({ error: "Payment has not succeeded" }, { status: 400 });
                }

                // Verify amount
                if (!fare || fare < 0.50) {
                    console.error(`Payment verification failed: Invalid fare amount for card payment (${fare})`);
                    return NextResponse.json({ error: "Invalid fare amount for card payment" }, { status: 400 });
                }
                if (paymentIntent.amount !== Math.round(fare * 100)) {
                    console.error(`Payment verification failed: Payment amount mismatch (PI: ${paymentIntent.amount}, Fare: ${Math.round(fare * 100)})`);
                    return NextResponse.json({ error: "Payment amount mismatch" }, { status: 400 });
                }

                // Verify currency
                if (paymentIntent.currency !== 'gbp') {
                    console.error(`Payment verification failed: Payment currency mismatch (${paymentIntent.currency})`);
                    return NextResponse.json({ error: "Payment currency mismatch" }, { status: 400 });
                }

                // Verify tenant metadata if exists
                if (paymentIntent.metadata?.tenantId && paymentIntent.metadata.tenantId !== tenantId && paymentIntent.metadata.tenantId !== 'system') {
                    console.error(`Payment verification failed: Payment tenant mismatch (${paymentIntent.metadata.tenantId} != ${tenantId})`);
                    return NextResponse.json({ error: "Payment tenant mismatch" }, { status: 400 });
                }

                verifiedPaymentStatus = 'PAID';
                verifiedPaymentProvider = 'STRIPE';
                verifiedStripePaymentIntentId = paymentIntent.id;
                verifiedPaymentReferenceId = paymentIntent.id;

            } catch (error: any) {
                console.error("Payment Verification Error:", error.message || error);
                return NextResponse.json({ error: "Failed to verify payment intent" }, { status: 400 });
            }
        }

        // 3. Prepare Common Job Data
        const commonJobData = {
            tenantId,
            customerId,
            bookedById: session.user.id || null,
            passengerName: body.passengerName || "Unknown",
            passengerPhone: body.passengerPhone || "Unknown",
            passengerEmail: body.passengerEmail || null,
            passengers: body.passengers ? parseInt(body.passengers) : 1,
            luggage: body.luggage ? parseInt(body.luggage) : 0,
            vehicleType: body.vehicleType || 'Saloon',
            requiresWav: isWavType,
            flightNumber: body.flightNumber || null,
            vias: body.vias || undefined, // JSON
            paymentType: body.paymentType || 'CASH',
            accountId: body.paymentType === 'ACCOUNT' ? (body.accountId || null) : null,
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

        if (body.isRecurring && body.recurrenceRule) {
            const limitDate = new Date();
            limitDate.setDate(limitDate.getDate() + 28); // Max 4 weeks ahead for now
            const endDate = body.recurrenceEnd ? new Date(body.recurrenceEnd) : limitDate;

            // Safety clamp
            const actualEndDate = endDate > limitDate ? limitDate : endDate;

            const interval = body.recurrenceInterval ? parseInt(body.recurrenceInterval) : 1;
            const daysList = Array.isArray(body.recurrenceDays) ? body.recurrenceDays : [];
            const exclusions = Array.isArray(body.recurrenceExclusions) ? body.recurrenceExclusions : [];

            let currentDate = new Date(finalPickupTime);
            let safetyCounter = 0;

            const startMs = new Date(finalPickupTime.getFullYear(), finalPickupTime.getMonth(), finalPickupTime.getDate()).getTime();

            while (currentDate <= actualEndDate && safetyCounter < 100) {
                const dayOfWeek = currentDate.getDay(); // 0=Sun, 1=Mon...
                const dateStr = currentDate.toISOString().slice(0, 10); // "YYYY-MM-DD"
                
                let shouldCreate = false;

                // Check exclusions
                if (!exclusions.includes(dateStr)) {
                    // Check if it matches start date (always create first job if not excluded)
                    if (currentDate.getTime() === finalPickupTime.getTime()) {
                        shouldCreate = true;
                    } else {
                        // Calculate differences since start date
                        const currentMs = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate()).getTime();
                        const diffDays = Math.round((currentMs - startMs) / (24 * 60 * 60 * 1000));
                        
                        if (body.recurrenceRule === 'DAILY') {
                            if (diffDays % interval === 0) shouldCreate = true;
                        } else if (body.recurrenceRule === 'WEEKLY') {
                            const diffWeeks = Math.floor(diffDays / 7);
                            if (diffWeeks % interval === 0) {
                                if (daysList.length > 0) {
                                    if (daysList.includes(dayOfWeek)) shouldCreate = true;
                                } else {
                                    if (dayOfWeek === finalPickupTime.getDay()) shouldCreate = true;
                                }
                            }
                        } else if (body.recurrenceRule === 'WEEKDAYS') {
                            if (dayOfWeek >= 1 && dayOfWeek <= 5) shouldCreate = true;
                        } else if (body.recurrenceRule === 'WEEKENDS') {
                            if (dayOfWeek === 0 || dayOfWeek === 6) shouldCreate = true;
                        } else if (body.recurrenceRule === 'MONTHLY') {
                            // Calculate month diff
                            const diffMonths = (currentDate.getFullYear() - finalPickupTime.getFullYear()) * 12 + (currentDate.getMonth() - finalPickupTime.getMonth());
                            if (diffMonths % interval === 0 && currentDate.getDate() === finalPickupTime.getDate()) {
                                shouldCreate = true;
                            }
                        }
                    }
                }

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
                        recurrenceEnd: body.recurrenceEnd ? new Date(body.recurrenceEnd) : null,
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
            // Apply verified payment ONLY to the primary (first) generated job
            if (createdCount === 0) {
                (jobData as any).paymentStatus = verifiedPaymentStatus;
                (jobData as any).paymentProvider = verifiedPaymentProvider;
                (jobData as any).paymentReferenceId = verifiedPaymentReferenceId;
                (jobData as any).stripePaymentIntentId = verifiedStripePaymentIntentId;
            }
            const job = await prisma.job.create({ data: jobData as any });
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
                    parentJobId: newJob!.id,
                    // Return bookings must always be created unpaid initially 
                    // unless a separate payment intent is explicitly captured for them.
                    paymentStatus: 'UNPAID',
                    paymentProvider: null,
                    paymentReferenceId: null,
                    stripePaymentIntentId: null
                }
            });
        }

        // Link recent call if exists
        if (newJob && body.passengerPhone) {
            await linkRecentCallToBooking(newJob.id, body.passengerPhone, tenantId);
        }

        // 6. Send Confirmation Email (Async, don't block response)
        const jobWithDetails = { ...newJob, passengerEmail: body.passengerEmail };

        const tenantSettings = await prisma.tenant.findUnique({ where: { id: tenantId } });

        const muteNotifications = body.notes && body.notes.includes('NO_NOTIFICATIONS');

        // Notifications: Email & SMS
        const notificationPromises = [];

        if (!muteNotifications) {
            notificationPromises.push(
                EmailService.sendBookingConfirmation(jobWithDetails as any, tenantSettings).catch(e => console.error("Failed to send email", e))
            );

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
        }

        if (returnJob) {
            const returnJobWithDetails = { ...returnJob, passengerEmail: body.passengerEmail };
            if (!muteNotifications) {
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
