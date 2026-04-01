import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from "@/auth";

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    try {
        const session = await auth();
        if (!session?.user?.tenantId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const { searchParams } = new URL(req.url);
        const phone = searchParams.get('phone');

        if (!phone || phone.length < 3) {
            return NextResponse.json({ error: 'Phone number required' }, { status: 400 });
        }

        const tenantId = session.user.tenantId;

        // Find customer
        const customer = await prisma.customer.findFirst({
            where: {
                tenantId,
                phone: {
                    contains: phone, // Allow partial match for standard search
                    mode: 'insensitive'
                }
            },
            include: {
                _count: {
                    select: { jobs: true }
                },
                jobs: {
                    take: 3,
                    orderBy: {
                        pickupTime: 'desc'
                    }
                }
            }
        });

        if (!customer) {
            return NextResponse.json({ found: false });
        }

        const recentJobs = customer.jobs.map(job => ({
            id: job.id || '',
            pickup: job.pickupAddress,
            pickupLat: job.pickupLat,
            pickupLng: job.pickupLng,
            dropoff: job.dropoffAddress,
            dropoffLat: job.dropoffLat,
            dropoffLng: job.dropoffLng,
            date: job.pickupTime,
        }));

        const lastJob = recentJobs[0] || null;

        return NextResponse.json({
            found: true,
            customer: {
                id: customer.id,
                name: customer.name,
                email: customer.email,
                phone: customer.phone,
                notes: customer.notes
            },
            lastJob: lastJob,
            recentJobs: recentJobs,
            stats: {
                totalBookings: customer._count.jobs,
                lastBookingDate: lastJob?.date || null
            }
        });

    } catch (error) {
        console.error('Lookup failed:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
