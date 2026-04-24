import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { format, startOfDay, endOfDay, parseISO, eachDayOfInterval, eachMonthOfInterval } from 'date-fns';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    try {
        const session = await auth();
        // Restrict reports to internal staff only
        if (!session?.user?.tenantId || !['SUPER_ADMIN', 'ADMIN', 'DISPATCHER'].includes(session.user.role as string)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const tenantId = session.user.tenantId;

        // Parse query params
        const { searchParams } = new URL(req.url);
        const startDateParam = searchParams.get('startDate');
        const endDateParam = searchParams.get('endDate');

        // Default to last 30 days if not provided
        const endDate = endDateParam ? endOfDay(parseISO(endDateParam)) : endOfDay(new Date());
        const startDate = startDateParam ? startOfDay(parseISO(startDateParam)) : startOfDay(new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000));

        // 1. Fetch all raw jobs for the period
        const jobs = await prisma.job.findMany({
            where: {
                tenantId,
                pickupTime: {
                    gte: startDate,
                    lte: endDate
                }
            },
            include: {
                driver: true,
                account: true,
                tenant: true
            }
        });

        // 2. Compute Top Level KPIs
        const completedJobs = jobs.filter(j => j.status === 'COMPLETED');
        const cancelledJobs = jobs.filter(j => ['CANCELLED', 'NO_SHOW'].includes(j.status));

        const totalRevenue = completedJobs.reduce((sum, j) => sum + (j.fare || 0), 0);
        const totalWaitRevenue = completedJobs.reduce((sum, j) => sum + (j.waitingCost || 0), 0);
        const totalTips = 0; // If tips field gets added later

        const kpis = {
            totalRevenue,
            totalJobs: jobs.length,
            completedJobs: completedJobs.length,
            cancelledJobs: cancelledJobs.length,
            cancellationRate: jobs.length > 0 ? (cancelledJobs.length / jobs.length) : 0,
            avgFare: completedJobs.length > 0 ? (totalRevenue / completedJobs.length) : 0,
            totalWaitRevenue
        };

        // 3. Time-based Series (Daily Revenue & Volume)
        // Grouping locally for speed on smaller datasets. Prisma group_by on DateTime requires native SQL usually.
        const timeSeriesMap = new Map<string, { date: string, revenue: number, jobs: number }>();

        // Ensure every date in interval has a slot (so zero-revenue days show)
        eachDayOfInterval({ start: startDate, end: endDate }).forEach(day => {
            timeSeriesMap.set(format(day, 'yyyy-MM-dd'), { date: format(day, 'MMM do'), revenue: 0, jobs: 0 });
        });

        completedJobs.forEach(job => {
            const dayKey = format(job.pickupTime, 'yyyy-MM-dd');
            const metrics = timeSeriesMap.get(dayKey);
            if (metrics) {
                metrics.revenue += (job.fare || 0);
                metrics.jobs += 1;
            }
        });

        const timeSeries = Array.from(timeSeriesMap.values());

        // 4. Driver Earnings & Settlements
        const driverMap = new Map<string, any>();
        completedJobs.forEach(job => {
            if (job.driverId && job.driver) {
                const metrics = driverMap.get(job.driverId) || { 
                    driverId: job.driverId, 
                    name: job.driver.name, 
                    callsign: job.driver.callsign, 
                    revenue: 0, 
                    jobs: 0,
                    commissionRate: job.driver.commissionRate || 20,
                    platformFee: 0,
                    netEarnings: 0,
                    cashCollected: 0,
                    driverCardCollected: 0,
                    tenantCardCollected: 0,
                    settlementBalance: 0
                };

                const fare = job.fare || 0;
                metrics.revenue += fare;
                metrics.jobs += 1;
                
                const fee = fare * (metrics.commissionRate / 100);
                metrics.platformFee += fee;
                metrics.netEarnings += (fare - fee);

                if (job.paymentType === 'CASH') {
                    metrics.cashCollected += fare;
                } else if (job.paymentType === 'CARD') {
                    if (job.paymentProvider === 'STRIPE' || job.tenant?.paymentRouting === 'CENTRAL') {
                        metrics.tenantCardCollected += fare;
                    } else if (job.tenant?.paymentRouting === 'DRIVER') {
                        metrics.driverCardCollected += fare;
                    } else {
                        // Fallback to central
                        metrics.tenantCardCollected += fare;
                    }
                }

                driverMap.set(job.driverId, metrics);
            }
        });

        // Calculate final settlement balance: Net Earnings - (Cash + Driver Card)
        const driverPerformance = Array.from(driverMap.values()).map(m => {
            m.settlementBalance = m.netEarnings - (m.cashCollected + m.driverCardCollected);
            return m;
        }).sort((a, b) => b.revenue - a.revenue);

        // 5. Account Leaderboard
        const accountMap = new Map<string, { accountId: string, name: string, code: string, revenue: number, jobs: number }>();
        completedJobs.forEach(job => {
            if (job.accountId && job.account) {
                const metrics = accountMap.get(job.accountId) || { accountId: job.accountId, name: job.account.name, code: job.account.code, revenue: 0, jobs: 0 };
                metrics.revenue += (job.fare || 0);
                metrics.jobs += 1;
                accountMap.set(job.accountId, metrics);
            }
        });
        const accountPerformance = Array.from(accountMap.values()).sort((a, b) => b.revenue - a.revenue);

        // 6. Shift Analysis (Heatmap by hour of day)
        // Array of 24 hours initialized to 0
        const shiftData = Array.from({ length: 24 }).map((_, i) => ({
            hour: i,
            label: `${i.toString().padStart(2, '0')}:00`,
            jobs: 0
        }));

        completedJobs.forEach(job => {
            const hour = new Date(job.pickupTime).getHours();
            shiftData[hour].jobs += 1;
        });

        // 7. Assemble final payload
        const report = {
            kpis,
            timeSeries,
            driverPerformance,
            accountPerformance,
            shiftData,
            meta: {
                startDate,
                endDate,
                generatedAt: new Date()
            }
        };

        return new NextResponse(JSON.stringify(report, (_, v) => typeof v === 'bigint' ? v.toString() : v), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Failed to generate reports:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
