import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { calculatePrice } from '@/lib/pricing'
import { auth } from '@/auth'

// GET /api/jobs
export async function GET(req: Request) {
    try {
        const session = await auth()
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const jobs = await prisma.job.findMany({
            where: {
                tenantId: session.user.tenantId
            },
            include: {
                customer: true,
                driver: true,
            },
            orderBy: {
                bookedAt: 'desc'
            }
        })

        return NextResponse.json(jobs)
    } catch (error) {
        console.error('Error fetching jobs:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

// POST /api/jobs
export async function POST(request: Request) {
    try {
        const body = await request.json()
        const apiKey = request.headers.get('x-api-key');

        let tenantId: string | null = null;

        if (apiKey) {
            const tenant = await prisma.tenant.findUnique({
                where: { apiKey: apiKey }
            });
            if (tenant) {
                tenantId = tenant.id;
            } else {
                return NextResponse.json({ error: 'Invalid API Key' }, { status: 401 });
            }
        } else {
            const session = await auth();
            if (session?.user?.tenantId) {
                tenantId = session.user.tenantId;
            }
        }

        if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        // If phone is provided, find or create customer
        let customerId = body.customerId
        if (!customerId && body.passengerPhone) {
            const customer = await prisma.customer.upsert({
                where: {
                    tenantId_phone: {
                        tenantId: tenantId,
                        phone: body.passengerPhone
                    }
                },
                update: {
                    name: body.passengerName
                },
                create: {
                    phone: body.passengerPhone,
                    name: body.passengerName,
                    tenantId: tenantId
                }
            })
            customerId = customer.id
        }

        // Validate and Parse Date
        const pickupTimeStr = body.pickupTime;
        let finalPickupTime = new Date();

        if (pickupTimeStr) {
            const parsed = new Date(pickupTimeStr);
            if (!isNaN(parsed.getTime())) {
                finalPickupTime = parsed;
            }
        }

        let fare = body.fare ? parseFloat(body.fare) : null;
        let isFixedPrice = false;

        // Auto-calculate price ONLY if not provided/overridden
        if ((!fare || fare === 0) && body.pickupAddress && body.dropoffAddress) {
            try {
                const pricingResult = await calculatePrice({
                    pickup: body.pickupAddress,
                    dropoff: body.dropoffAddress,
                    pickupTime: finalPickupTime,
                    tenantId: tenantId,
                    distanceMiles: 0
                });
                fare = pricingResult.price;
                isFixedPrice = pricingResult.breakdown?.isFixed || false;
            } catch (err) {
                console.warn('Pricing calculation failed', err);
            }
        }

        // Verify Tenant Exists to prevent foreign key constraint failures if session is stale
        const tenantExists = await prisma.tenant.findUnique({ where: { id: tenantId } });
        if (!tenantExists) {
            return NextResponse.json({ error: 'Session Stale', details: 'Your session belongs to a deleted tenant. Please Sign Out and Login again.' }, { status: 401 });
        }

        const job = await prisma.job.create({
            data: {
                pickupAddress: body.pickupAddress || 'Unknown',
                dropoffAddress: body.dropoffAddress || 'Unknown',
                passengerName: body.passengerName || 'Unknown',
                passengerPhone: body.passengerPhone || 'Unknown',
                pickupTime: finalPickupTime,

                fare: fare || 0,
                paymentType: body.paymentType || 'CASH', // Added paymentType
                isFixedPrice: isFixedPrice,
                status: body.status || 'PENDING',
                flightNumber: body.flightNumber,
                tenantId: tenantId,
                customerId: customerId
            }
        })

        return NextResponse.json(job)
    } catch (error: any) {
        console.error('Error creating job:', error);
        return NextResponse.json({
            error: 'Internal Server Error',
            details: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined
        }, { status: 500 })
    }
}
