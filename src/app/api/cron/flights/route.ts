import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: Request) {
    try {
        // Vercel Cron Security Check
        const authHeader = req.headers.get('authorization');
        if (
            process.env.CRON_SECRET &&
            authHeader !== `Bearer ${process.env.CRON_SECRET}`
        ) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 1. Find all PENDING bookings in the next 24 hours that have a flight number
        const next24h = new Date(Date.now() + 24 * 60 * 60 * 1000);

        const jobsToCheck = await prisma.job.findMany({
            where: {
                status: 'PENDING',
                flightNumber: {
                    not: null,           // Must have a flight number
                    notIn: ['', ' ']     // Must not be empty
                },
                pickupTime: {
                    gte: new Date(),     // Must be in the future
                    lte: next24h         // Must be within 24 hours
                }
            },
            select: {
                id: true,
                flightNumber: true,
                pickupTime: true,
                notes: true
            }
        });

        if (jobsToCheck.length === 0) {
            return NextResponse.json({ message: "No upcoming flights to check." });
        }

        // 2. We could optimize by checking same flight numbers once, 
        // but for safety in case of separate dates, iterate individually.
        let updatedCount = 0;

        for (const job of jobsToCheck) {
            if (!job.flightNumber) continue;

            const apiKey = process.env.AVIATION_STACK_API_KEY || 'f01acfac513511eb4fcdaeb75d4a1fe4';
            const url = `http://api.aviationstack.com/v1/flights?access_key=${apiKey}&flight_iata=${encodeURIComponent(job.flightNumber)}`;

            try {
                const res = await fetch(url);
                if (!res.ok) continue;

                const data = await res.json();
                const flight = data.data?.[0]; // Get most recent match

                if (flight && flight.arrival && flight.arrival.estimated) {
                    const estArrival = new Date(flight.arrival.estimated);

                    // If estimated arrival is more than 30 mins different from scheduled pickup, flag it in notes
                    const diffMs = Math.abs(estArrival.getTime() - new Date(job.pickupTime).getTime());
                    const diffMins = Math.floor(diffMs / (1000 * 60));

                    if (diffMins >= 15) {
                        const newNoteLine = `[SYSTEM] Automated Flight Check: Est Arrival is ${estArrival.toLocaleTimeString()}`;
                        const currentNotes = job.notes || "";

                        // Prevent duplicate notes
                        if (!currentNotes.includes("Automated Flight Check")) {
                            await prisma.job.update({
                                where: { id: job.id },
                                data: {
                                    notes: currentNotes ? `${currentNotes}\n${newNoteLine}` : newNoteLine
                                }
                            });
                            updatedCount++;
                        }
                    }
                }
            } catch (err) {
                console.error(`Failed to fetch flight ${job.flightNumber}:`, err);
                // Continue to next job
            }
        }

        return NextResponse.json({
            success: true,
            message: `Checked ${jobsToCheck.length} flights. Updated ${updatedCount} bookings with delays.`
        });

    } catch (error) {
        console.error("Cron Flight Update error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
