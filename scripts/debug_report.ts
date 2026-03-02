import { PrismaClient } from '@prisma/client';
import { format, startOfDay, endOfDay, parseISO, eachDayOfInterval } from 'date-fns';

const prisma = new PrismaClient();

async function run() {
    try {
        const tenant = await prisma.tenant.findFirst();
        if (!tenant) {
            console.log("No tenant found.");
            process.exit(1);
        }

        const tenantId = tenant.id;
        console.log("Using TenantID:", tenantId);

        const endDateParam = new Date().toISOString();
        const startDateParam = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

        const endDate = endDateParam ? endOfDay(parseISO(endDateParam)) : endOfDay(new Date());
        const startDate = startDateParam ? startOfDay(parseISO(startDateParam)) : startOfDay(new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000));

        console.log("Start Date:", startDate);
        console.log("End Date:", endDate);

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
                account: true
            }
        });

        console.log("Found jobs:", jobs.length);

        const completedJobs = jobs.filter(j => j.status === 'COMPLETED');
        const cancelledJobs = jobs.filter(j => ['CANCELLED', 'NO_SHOW'].includes(j.status));

        const totalRevenue = completedJobs.reduce((sum, j) => sum + (j.fare || 0), 0);
        const totalWaitRevenue = completedJobs.reduce((sum, j) => sum + (j.waitingCost || 0), 0);

        const kpis = {
            totalRevenue,
            totalJobs: jobs.length,
            completedJobs: completedJobs.length,
            cancelledJobs: cancelledJobs.length,
            cancellationRate: jobs.length > 0 ? (cancelledJobs.length / jobs.length) : 0,
            avgFare: completedJobs.length > 0 ? (totalRevenue / completedJobs.length) : 0,
            totalWaitRevenue
        };
        console.log("KPIs:", kpis);

        const timeSeriesMap = new Map<string, { date: string, revenue: number, jobs: number }>();

        eachDayOfInterval({ start: startDate, end: endDate }).forEach(day => {
            timeSeriesMap.set(format(day, 'yyyy-MM-dd'), { date: format(day, 'MMM do'), revenue: 0, jobs: 0 });
        });

        console.log("Initialized TimeSeriesMap with size:", timeSeriesMap.size);

        completedJobs.forEach(job => {
            const dayKey = format(job.pickupTime, 'yyyy-MM-dd');
            const metrics = timeSeriesMap.get(dayKey);
            if (metrics) {
                metrics.revenue += (job.fare || 0);
                metrics.jobs += 1;
            } else {
                console.log("Missing metrics for dayKey:", dayKey, "job.pickupTime:", job.pickupTime);
            }
        });

        // 6. Shift Analysis (Heatmap by hour of day)
        const shiftData = Array.from({ length: 24 }).map((_, i) => ({
            hour: i,
            label: `${i.toString().padStart(2, '0')}:00`,
            jobs: 0
        }));

        completedJobs.forEach(job => {
            const hour = new Date(job.pickupTime).getHours();
            shiftData[hour].jobs += 1;
        });

        console.log("ShiftData processed successfully.");

        console.log("Success! No crashes.");
    } catch (err) {
        console.error("CRASHED:", err);
    } finally {
        await prisma.$disconnect();
    }
}
run();
