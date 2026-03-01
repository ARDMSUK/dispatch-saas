import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export async function GET(req: Request) {
    try {
        const session = await auth();
        const user = session?.user as any;
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const hoursParam = searchParams.get('hours');
        const hours = hoursParam ? parseInt(hoursParam, 10) : 2; // Default lookback 2 hours

        const now = new Date();
        const lookback = new Date(now.getTime() - hours * 60 * 60 * 1000);
        const lookahead = new Date(now.getTime() + 24 * 60 * 60 * 1000);

        // Fetch pending jobs that need dispatching
        const pendingJobs = await prisma.job.findMany({
            where: {
                tenantId: user.tenantId,
                status: 'PENDING',
                pickupTime: {
                    gte: lookback,
                    lte: lookahead
                },
                driverId: null
            },
            select: {
                id: true,
                pickupLat: true,
                pickupLng: true,
            }
        });

        // Group by approximate location (round to ~100m) to reduce payload and calculate weight
        const heatmapData: Record<string, { lat: number, lng: number, weight: number }> = {};

        pendingJobs.forEach(job => {
            if (job.pickupLat && job.pickupLng) {
                // Rounding to 3 decimal places gives roughly 111m precision
                const roundedLat = Math.round(job.pickupLat * 1000) / 1000;
                const roundedLng = Math.round(job.pickupLng * 1000) / 1000;
                const key = `${roundedLat},${roundedLng}`;

                if (heatmapData[key]) {
                    heatmapData[key].weight += 1;
                } else {
                    heatmapData[key] = {
                        lat: roundedLat,
                        lng: roundedLng,
                        weight: 1
                    };
                }
            }
        });

        return NextResponse.json({
            success: true,
            data: Object.values(heatmapData),
            totalJobs: pendingJobs.length
        });

    } catch (error) {
        console.error("Heatmap fetch error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
