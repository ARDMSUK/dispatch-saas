import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    try {
        const session = await auth();
        if (!session?.user?.tenantId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const tenantId = session.user.tenantId;

        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
        const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

        const startOfLastWeek = new Date(startOfToday.getTime() - 7 * 24 * 60 * 60 * 1000);
        const endOfLastWeek = new Date(endOfToday.getTime() - 7 * 24 * 60 * 60 * 1000);

        // 1. Fetch Drivers Info
        const drivers = await prisma.driver.findMany({
            where: { tenantId },
            select: { id: true, status: true }
        });

        const totalDrivers = drivers.length;
        const driversOnline = drivers.filter(d => d.status !== 'OFF_DUTY').length;
        const driversAvailable = drivers.filter(d => d.status === 'FREE' || d.status === 'ONLINE').length;
        const driversBooked = drivers.filter(d => d.status === 'BUSY').length;

        // 2. Fetch Active Operators
        const operators = await prisma.user.findMany({
            where: { tenantId, role: 'DISPATCHER' },
            select: { id: true, presenceStatus: true }
        });
        const operatorsActive = operators.filter(o => o.presenceStatus === 'ONLINE' || o.presenceStatus === 'BUSY').length;

        // 3. Fetch Today's Jobs
        const todayJobs = await prisma.job.findMany({
            where: {
                tenantId,
                pickupTime: {
                    gte: startOfToday,
                    lte: endOfToday
                }
            },
            include: {
                calls: {
                    select: { answeredByExt: true }
                }
            }
        });

        // 4. Fetch Last Week's Jobs for Chart comparison
        const lastWeekJobs = await prisma.job.findMany({
            where: {
                tenantId,
                pickupTime: {
                    gte: startOfLastWeek,
                    lte: endOfLastWeek
                }
            },
            select: { pickupTime: true }
        });

        // Compute booking status metrics
        const completedCount = todayJobs.filter(j => j.status === 'COMPLETED').length;
        const cancelledCount = todayJobs.filter(j => j.status === 'CANCELLED').length;
        const noShowCount = todayJobs.filter(j => j.status === 'NO_SHOW').length;
        
        const lateCount = todayJobs.filter(j => 
            !['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(j.status) && 
            new Date(j.pickupTime) < now
        ).length;

        const dispatchingCount = todayJobs.filter(j => 
            ['DISPATCHING', 'ACCEPTED', 'EN_ROUTE', 'POB'].includes(j.status)
        ).length;

        const prebookingsCount = todayJobs.filter(j => 
            j.status === 'PENDING' && new Date(j.pickupTime) > now
        ).length;

        // Booking Channel Attribution (in memory)
        let webBookings = 0;
        let appBookings = 0;
        let voiceAiBookings = 0;
        let ivrBookings = 0; // fallback / whatsapp
        let dispatcherBookings = 0;

        todayJobs.forEach(job => {
            if (job.bookedById !== null) {
                dispatcherBookings++;
            } else {
                // Check calls relation or notes
                const hasVoiceCall = job.calls && job.calls.some((c: any) => c.answeredByExt === 'Voice AI');
                const isVoiceNote = job.notes && (job.notes.toLowerCase().includes('voice') || job.notes.toLowerCase().includes('vapi'));
                const isWhatsAppNote = job.notes && (job.notes.toLowerCase().includes('whatsapp') || job.notes.toLowerCase().includes('webchat'));

                if (hasVoiceCall || isVoiceNote) {
                    voiceAiBookings++;
                } else if (isWhatsAppNote) {
                    ivrBookings++;
                } else if (job.notes && (job.notes.toLowerCase().includes('app') || job.notes.toLowerCase().includes('mobile'))) {
                    appBookings++;
                } else {
                    webBookings++; // Default to web widget booking if no agent/app notes exist
                }
            }
        });

        // 5. Build Hourly Trend comparison (00:00 - 23:00)
        const hourlyTrend = Array.from({ length: 24 }, (_, i) => {
            const hourStr = `${String(i).padStart(2, '0')}:00`;
            
            // Count matching jobs today in this hour
            const todayCount = todayJobs.filter(j => {
                const jobHour = new Date(j.pickupTime).getHours();
                return jobHour === i;
            }).length;

            // Count matching jobs last week in this hour
            const lastWeekCount = lastWeekJobs.filter(j => {
                const jobHour = new Date(j.pickupTime).getHours();
                return jobHour === i;
            }).length;

            return {
                hour: hourStr,
                Today: todayCount,
                'Last Week': lastWeekCount
            };
        });

        return NextResponse.json({
            operatorsActive,
            driversOnline,
            driversAvailable,
            driversBooked,
            totalDrivers,
            completedCount,
            cancelledCount,
            noShowCount,
            lateCount,
            dispatchingCount,
            prebookingsCount,
            channels: {
                web: webBookings,
                app: appBookings,
                voice: voiceAiBookings,
                ivr: ivrBookings,
                dispatcher: dispatcherBookings
            },
            hourlyTrend
        });

    } catch (error: any) {
        console.error('Error fetching wallboard report details:', error);
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
}
