import { NextResponse } from 'next/server';
import { fetchFlightStatus } from '@/lib/flight-service';
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id || !session?.user?.tenantId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const url = new URL(req.url);
        const flightNumber = url.searchParams.get('flightNumber');
        const dateStringParam = url.searchParams.get('dateString');

        if (!flightNumber) {
            return NextResponse.json({ error: 'Flight number is required' }, { status: 400 });
        }

        // Look up the aviation stack key for the current tenant
        const tenant = await prisma.tenant.findUnique({
            where: { id: session.user.tenantId },
            select: { aviationStackApiKey: true }
        });

        // Determine the pickup time and dateString to use as cache key
        let pickupTime: Date;
        let dString = dateStringParam;

        if (!dString) {
            const activeJob = await prisma.job.findFirst({
                where: { 
                    tenantId: session.user.tenantId, 
                    flightNumber, 
                    status: { notIn: ['COMPLETED', 'CANCELLED', 'NO_SHOW'] } 
                },
                orderBy: { pickupTime: 'asc' }
            });
            if (activeJob) {
                pickupTime = activeJob.pickupTime;
                dString = pickupTime.toISOString().split('T')[0];
            } else {
                pickupTime = new Date();
                dString = pickupTime.toISOString().split('T')[0];
            }
        } else {
            pickupTime = new Date(dString);
        }

        // Fetch existing cache
        let cache = await prisma.flightCache.findUnique({
            where: {
                tenantId_flightNumber_dateString: {
                    tenantId: session.user.tenantId,
                    flightNumber,
                    dateString: dString
                }
            }
        });

        // Determine if we need to fetch live data (Lazy Polling Logic)
        const now = new Date();
        const diffHours = (pickupTime.getTime() - now.getTime()) / (1000 * 60 * 60);
        let stale = false;

        if (cache && String(cache.status).toLowerCase() === 'landed') {
            stale = false; // Flight has landed? Stop checking entirely.
        } else if (!cache) {
            stale = true; // Always fetch at least once to get baseline
        } else {
            const hoursSinceCheck = (now.getTime() - cache.lastCheckedAt.getTime()) / (1000 * 60 * 60);
            
            if (diffHours <= 1) {
                stale = hoursSinceCheck >= 0.25; // 15 minutes
            } else if (diffHours <= 4) {
                stale = hoursSinceCheck >= 1; // 1 hour
            } else {
                // > 4 hours away (including tomorrow), don't check it at all.
                stale = false; 
            }
        }

        if (stale) {
            console.log(`[Flight API] Cache Stale for ${flightNumber}. Fetching from AviationStack...`);
            const data = await fetchFlightStatus(flightNumber, tenant?.aviationStackApiKey);

            if (data) {
                cache = await prisma.flightCache.upsert({
                    where: {
                        tenantId_flightNumber_dateString: {
                            tenantId: session.user.tenantId,
                            flightNumber,
                            dateString: dString
                        }
                    },
                    update: {
                        status: data.status,
                        scheduledArrival: data.scheduledArrival ? new Date(data.scheduledArrival) : null,
                        estimatedArrival: data.estimatedArrival ? new Date(data.estimatedArrival) : null,
                        actualArrival: data.actualArrival ? new Date(data.actualArrival) : null,
                        terminal: data.terminal,
                        gate: data.gate,
                        airline: data.airline,
                        lastCheckedAt: now
                    },
                    create: {
                        tenantId: session.user.tenantId,
                        flightNumber,
                        dateString: dString,
                        status: data.status,
                        scheduledArrival: data.scheduledArrival ? new Date(data.scheduledArrival) : null,
                        estimatedArrival: data.estimatedArrival ? new Date(data.estimatedArrival) : null,
                        actualArrival: data.actualArrival ? new Date(data.actualArrival) : null,
                        terminal: data.terminal,
                        gate: data.gate,
                        airline: data.airline,
                        lastCheckedAt: now
                    }
                });
            }
        } else {
            console.log(`[Flight API] Serving cached data for ${flightNumber}.`);
        }

        // Format to match frontend expectations
        if (!cache) {
            return NextResponse.json({ error: 'Failed to retrieve flight data' }, { status: 500 });
        }

        return NextResponse.json({
            status: cache.status,
            scheduledArrival: cache.scheduledArrival,
            estimatedArrival: cache.estimatedArrival,
            actualArrival: cache.actualArrival,
            terminal: cache.terminal,
            gate: cache.gate,
            airline: cache.airline,
            lastCheckedAt: cache.lastCheckedAt
        });

    } catch (error) {
        console.error("Flight API Error:", error);
        return NextResponse.json({ error: 'Failed to fetch flight data' }, { status: 500 });
    }
}
