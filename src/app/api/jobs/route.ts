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
            if (session) {
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

        let fare = body.fare ? parseFloat(body.fare) : null;
        let isFixedPrice = false;

        // Auto-calculate price if not provided
        if (!fare && body.pickupAddress && body.dropoffAddress) {
            try {
                const pricingResult = await calculatePrice({
                    pickup: body.pickupAddress,
                    dropoff: body.dropoffAddress,
                    pickupTime: new Date(body.pickupTime || Date.now()),
                    tenantId: tenantId,
                    distanceMiles: 0 // TODO: Add Google Maps Distance Matrix here really
                });
                fare = pricingResult.price;
                isFixedPrice = pricingResult.breakdown.isFixed;
            } catch (err) {
                console.warn('Pricing calculation failed', err);
            }
        }

        const job = await prisma.job.create({
            data: {
                pickupAddress: body.pickupAddress,
                dropoffAddress: body.dropoffAddress,
                passengerName: body.passengerName,
                passengerPhone: body.passengerPhone,
                pickupTime: new Date(body.pickupTime || Date.now()),

                fare: fare,
                isFixedPrice: isFixedPrice,
                status: body.status || 'PENDING',
                flightNumber: body.flightNumber,
                tenantId: tenantId,
                customerId: customerId
            }
        })

        return NextResponse.json(job)
    } catch (error) {
        console.error('Error creating job:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
