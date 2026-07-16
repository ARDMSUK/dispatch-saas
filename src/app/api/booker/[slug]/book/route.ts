import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import Stripe from 'stripe';
import { EmailService } from '@/lib/email-service';
import { SmsService } from '@/lib/sms-service';
import { calculatePrice } from '@/lib/pricing';

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,OPTIONS,PATCH,DELETE,POST,PUT",
    "Access-Control-Allow-Headers": "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version",
};

// Temporary in-memory IP rate limiting fallback. Resets on serverless cold starts.
const ipRateLimit = new Map<string, { count: number, timestamp: number }>();
function checkIpRateLimit(ip: string): boolean {
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    const record = ipRateLimit.get(ip);
    
    if (record) {
        if (now - record.timestamp > oneHour) {
            ipRateLimit.set(ip, { count: 1, timestamp: now });
            return true;
        }
        if (record.count >= 5) return false;
        record.count += 1;
        return true;
    }
    ipRateLimit.set(ip, { count: 1, timestamp: now });
    return true;
}

export async function OPTIONS() {
    return new Response(null, { status: 204, headers: corsHeaders });
}

export async function POST(
    req: Request,
    { params }: { params: Promise<{ slug: string }> }
) {
    try {
        const { slug } = await params;
        const body = await req.json();

        const tenant = await prisma.tenant.findUnique({
            where: { slug }
        });

        if (!tenant) {
            return NextResponse.json({ error: 'Tenant not found' }, { status: 404, headers: corsHeaders });
        }

        if (!tenant.enableWebBooker) {
            return NextResponse.json({ error: 'Web booking is disabled' }, { status: 403, headers: corsHeaders });
        }

        if (tenant.subscriptionStatus === 'PAST_DUE' || tenant.subscriptionStatus === 'CANCELED') {
            return NextResponse.json({ error: 'Online bookings are temporarily unavailable for this operator.' }, { status: 403, headers: corsHeaders });
        }

        const {
            pickup,
            dropoff,
            vias,
            pickupTime,
            passengerName,
            passengerPhone,
            passengerEmail,
            vehicleType,
            scheduledTime,
            requiresWav,
            price,
            distanceMiles,
            notes,
            flightNumber,
            isWaitAndReturn,
            waitingTime,
            paymentType, // 'CARD' or 'CASH'
            expoPushToken, // Used to alert the customer when the driver arrives
            pickupLat,
            pickupLng,
            dropoffLat,
            dropoffLng,
            turnstileToken
        } = body;

        if (!pickup || !dropoff || !passengerName || !passengerPhone) {
            return NextResponse.json({ error: 'Missing required configuration' }, { status: 400, headers: corsHeaders });
        }

        if (paymentType === 'CARD' && !tenant.stripeSecretKey) {
            return NextResponse.json({ error: 'Card payments are not configured for this operator.' }, { status: 400, headers: corsHeaders });
        }

        const clientIp = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';

        // Turnstile Verification
        if (process.env.NODE_ENV === 'production' || turnstileToken !== '1x00000000000000000000AA') {
            if (!turnstileToken) {
                return NextResponse.json({ error: 'Security token missing. Please refresh the page.' }, { status: 400, headers: corsHeaders });
            }
            if (!process.env.TURNSTILE_SECRET_KEY) {
                if (process.env.NODE_ENV === 'production') {
                    return NextResponse.json({ error: 'Security verification service unavailable.' }, { status: 500, headers: corsHeaders });
                }
            } else {
                try {
                    const formData = new URLSearchParams();
                    formData.append('secret', process.env.TURNSTILE_SECRET_KEY);
                    formData.append('response', turnstileToken);
                    if (clientIp !== 'unknown') {
                        formData.append('remoteip', clientIp);
                    }

                    const verifyRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
                        method: 'POST',
                        body: formData
                    });
                    
                    const verifyData = await verifyRes.json();
                    if (!verifyData.success) {
                        return NextResponse.json({ error: 'Failed security check. Please try again.' }, { status: 403, headers: corsHeaders });
                    }
                } catch (e) {
                    return NextResponse.json({ error: 'Security verification service unavailable.' }, { status: 500, headers: corsHeaders });
                }
            }
        }

        // Rate limit check (IP)
        if (clientIp !== 'unknown' && !checkIpRateLimit(clientIp)) {
            return NextResponse.json({ error: 'Too many bookings requested. Please try again later.' }, { status: 429, headers: corsHeaders });
        }

        // Rate limit check (Phone/Email via DB)
        // Note: This counts all jobs for this phone/email in the tenant, including operator-created jobs,
        // as there is no specific bookingSource field to distinguish public vs operator bookings.
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        const phoneBookings = await prisma.job.count({
            where: {
                tenantId: tenant.id,
                passengerPhone,
                bookedAt: { gte: oneHourAgo }
            }
        });
        if (phoneBookings >= 3) {
            return NextResponse.json({ error: 'Too many bookings requested. Please try again later.' }, { status: 429, headers: corsHeaders });
        }

        if (passengerEmail) {
            const emailBookings = await prisma.job.count({
                where: {
                    tenantId: tenant.id,
                    passengerEmail,
                    bookedAt: { gte: oneHourAgo }
                }
            });
            if (emailBookings >= 3) {
                return NextResponse.json({ error: 'Too many bookings requested. Please try again later.' }, { status: 429, headers: corsHeaders });
            }
        }

        const requestedDate = pickupTime ? new Date(pickupTime) : (scheduledTime ? new Date(scheduledTime) : new Date());
        if (isNaN(requestedDate.getTime())) {
            return NextResponse.json({ error: 'Invalid pickup time.' }, { status: 400, headers: corsHeaders });
        }

        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        if (requestedDate < fiveMinutesAgo) {
            return NextResponse.json({ error: 'Pickup time cannot be in the past.' }, { status: 400, headers: corsHeaders });
        }

        const rawNotes = notes || '';
        let sanitizedNotes = rawNotes.replace(/\[(NO_NOTIFICATIONS|CASH_PAID|CARD_PAID|REFUNDED|INTERNAL|TEST|[A-Z_]{3,})\]/g, '').replace(/\s+/g, ' ').trim();
        if (!sanitizedNotes) {
            sanitizedNotes = 'Booked via Web/App';
        }
        sanitizedNotes += ' [WEB_BOOKER]';

        const baseContext = {
            pickup,
            dropoff,
            vias,
            distanceMiles,
            pickupTime: requestedDate,
            companyId: tenant.id,
            isWaitAndReturn,
            waitingTime,
            pickupLat,
            pickupLng,
            dropoffLat,
            dropoffLng
        };

        const calculatedPricing = await calculatePrice({
            ...baseContext,
            vehicleType: vehicleType || 'Saloon'
        });
        
        const serverFare = calculatedPricing.price;

        // Generate Booking UID
        const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, '');
        const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();

        // 2. Identify or Create Customer
        const customer = await prisma.customer.upsert({
            where: {
                tenantId_phone: {
                    tenantId: tenant.id,
                    phone: passengerPhone,
                }
            },
            update: {
                name: passengerName,
                email: passengerEmail,
                expoPushToken: expoPushToken || undefined
            },
            create: {
                tenantId: tenant.id,
                phone: passengerPhone,
                name: passengerName,
                email: passengerEmail,
                expoPushToken: expoPushToken || undefined
            }
        });

        const job = await prisma.job.create({
            data: {
                tenantId: tenant.id,
                customerId: customer.id,
                status: 'PENDING',
                pickupAddress: pickup,
                dropoffAddress: dropoff,
                vias: vias || [],
                pickupTime: requestedDate,
                scheduledTime: scheduledTime ? new Date(scheduledTime) : undefined,
                passengerName,
                passengerPhone,
                passengerEmail: passengerEmail || null,
                vehicleType: vehicleType || 'Saloon',
                requiresWav: requiresWav || false,
                fare: serverFare,
                notes: sanitizedNotes,
                flightNumber,
                isReturn: isWaitAndReturn || false,
                waitingTime: waitingTime || 0,
                paymentType: paymentType || 'CASH',
                paymentStatus: 'UNPAID',
                autoDispatch: tenant.autoDispatch
            }
        });

        let clientSecret = null;
        let publishableKey = tenant.stripePublishableKey;

        // Send Request Received immediately for all bookings
        if (!job.notes?.includes('[NO_NOTIFICATIONS]')) {
            const jobWithCustomer = { ...job, customer: { email: job.passengerEmail } };
            const notificationPromises = [
                EmailService.sendBookingRequestReceived(jobWithCustomer as any, tenant),
                SmsService.sendBookingRequestReceived(job as any, tenant)
            ];

            await Promise.allSettled(notificationPromises).then((results) => {
                results.forEach((result, index) => {
                    if (result.status === 'rejected') {
                        console.error(`Booking notification ${index} failed:`, result.reason);
                    }
                });
            });
        }

        return NextResponse.json({
            success: true,
            bookingId: job.id,
            clientSecret,
            publishableKey,
            fare: serverFare
        }, { headers: corsHeaders });

    } catch (error: any) {
        console.error('Error creating public booking:', error);
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500, headers: corsHeaders });
    }
}
