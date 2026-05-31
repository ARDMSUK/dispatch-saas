import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { startOfDay, endOfDay, parseISO, subDays } from 'date-fns';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    try {
        const session = await auth();
        if (!session?.user?.tenantId || !['SUPER_ADMIN', 'ADMIN', 'DISPATCHER'].includes(session.user.role as string)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const tenantId = session.user.tenantId;

        // Parse query params
        const { searchParams } = new URL(req.url);
        const startDateParam = searchParams.get('startDate');
        const endDateParam = searchParams.get('endDate');

        // Default to last 7 days for operator floor tracking, today starts at 00:00
        const endDate = endDateParam ? endOfDay(parseISO(endDateParam)) : endOfDay(new Date());
        const startDate = startDateParam ? startOfDay(parseISO(startDateParam)) : startOfDay(subDays(endDate, 7));

        // 1. Fetch operators/dispatchers for active floor directory
        const operators = await prisma.user.findMany({
            where: {
                tenantId,
                role: { in: ['SUPER_ADMIN', 'ADMIN', 'DISPATCHER'] }
            },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                sipExtension: true,
                presenceStatus: true,
                lastPresenceUpdate: true
            }
        });

        // 2. Fetch calls in range
        const calls = await prisma.incomingCall.findMany({
            where: {
                tenantId,
                createdAt: {
                    gte: startDate,
                    lte: endDate
                }
            }
        });

        // 3. Fetch jobs in range to track console bookings entered per dispatcher
        const bookings = await prisma.job.findMany({
            where: {
                tenantId,
                bookedById: { not: null },
                bookedAt: {
                    gte: startDate,
                    lte: endDate
                }
            },
            select: {
                bookedById: true,
                fare: true
            }
        });

        // 4. Calculate KPI summaries
        const totalCalls = calls.length;
        const answeredCalls = calls.filter(c => c.status === 'ANSWERED');
        const missedCalls = calls.filter(c => c.status === 'DISMISSED');

        const totalAnsweredCount = answeredCalls.length;
        const totalMissedCount = missedCalls.length;
        const missedCallRate = totalCalls > 0 ? (totalMissedCount / totalCalls) : 0;

        // Speed of Answer (ASA)
        let totalSpeedOfAnswerSec = 0;
        let speedOfAnswerCount = 0;
        answeredCalls.forEach(c => {
            if (c.answeredAt) {
                const diffMs = c.answeredAt.getTime() - c.createdAt.getTime();
                const diffSec = Math.max(0, Math.floor(diffMs / 1000));
                totalSpeedOfAnswerSec += diffSec;
                speedOfAnswerCount++;
            }
        });
        const avgSpeedOfAnswer = speedOfAnswerCount > 0 ? (totalSpeedOfAnswerSec / speedOfAnswerCount) : 0;

        // Talk Time (AHT)
        const totalTalkTimeSec = answeredCalls.reduce((sum, c) => sum + (c.duration || 0), 0);
        const avgHandleTime = totalAnsweredCount > 0 ? (totalTalkTimeSec / totalAnsweredCount) : 0;

        // 5. Build operator leaderboard analytics map
        const statsMap = new Map<string, {
            userId: string;
            name: string;
            sipExtension: string | null;
            callsAnswered: number;
            totalTalkTime: number;
            avgTalkTime: number;
            bookingsEntered: number;
            revenueGenerated: number;
        }>();

        operators.forEach(op => {
            statsMap.set(op.id, {
                userId: op.id,
                name: op.name || op.email.split('@')[0],
                sipExtension: op.sipExtension,
                callsAnswered: 0,
                totalTalkTime: 0,
                avgTalkTime: 0,
                bookingsEntered: 0,
                revenueGenerated: 0
            });
        });

        // Map call stats to users
        answeredCalls.forEach(c => {
            if (c.answeredById) {
                const item = statsMap.get(c.answeredById);
                if (item) {
                    item.callsAnswered++;
                    item.totalTalkTime += (c.duration || 0);
                }
            }
        });

        // Map bookings to users
        bookings.forEach(b => {
            if (b.bookedById) {
                const item = statsMap.get(b.bookedById);
                if (item) {
                    item.bookingsEntered++;
                    item.revenueGenerated += (b.fare || 0);
                }
            }
        });

        const operatorPerformance = Array.from(statsMap.values()).map(item => {
            item.avgTalkTime = item.callsAnswered > 0 ? (item.totalTalkTime / item.callsAnswered) : 0;
            return item;
        }).sort((a, b) => b.bookingsEntered - a.bookingsEntered);

        // 6. Find current active call per agent (within the last 10 minutes)
        const activeCallsList = await prisma.incomingCall.findMany({
            where: {
                tenantId,
                status: 'ANSWERED',
                answeredById: { not: null },
                updatedAt: { gte: new Date(Date.now() - 10 * 60 * 1000) }
            },
            select: {
                answeredById: true,
                phone: true,
                createdAt: true
            }
        });

        const activeCallsMap = new Map<string, { phone: string; duration: number }>();
        activeCallsList.forEach(c => {
            if (c.answeredById) {
                const duration = Math.max(0, Math.floor((Date.now() - c.createdAt.getTime()) / 1000));
                activeCallsMap.set(c.answeredById, { phone: c.phone, duration });
            }
        });

        const operatorDirectory = operators.map(op => {
            const activeCall = activeCallsMap.get(op.id) || null;
            return {
                id: op.id,
                name: op.name || op.email.split('@')[0],
                email: op.email,
                role: op.role,
                sipExtension: op.sipExtension,
                presenceStatus: op.presenceStatus,
                lastPresenceUpdate: op.lastPresenceUpdate,
                activeCall
            };
        });

        // 7. Time series timeline hourly distribution (for today/range chart)
        const hourlyTimeline = Array.from({ length: 24 }).map((_, i) => ({
            hour: i,
            label: `${i.toString().padStart(2, '0')}:00`,
            incoming: 0,
            answered: 0,
            missed: 0
        }));

        calls.forEach(c => {
            const hour = new Date(c.createdAt).getHours();
            hourlyTimeline[hour].incoming++;
            if (c.status === 'ANSWERED') {
                hourlyTimeline[hour].answered++;
            } else if (c.status === 'DISMISSED') {
                hourlyTimeline[hour].missed++;
            }
        });

        return NextResponse.json({
            kpis: {
                totalCalls,
                answeredCalls: totalAnsweredCount,
                missedCalls: totalMissedCount,
                missedCallRate,
                avgSpeedOfAnswer,
                avgHandleTime,
                totalTalkTime: totalTalkTimeSec
            },
            operatorDirectory,
            operatorPerformance,
            hourlyTimeline,
            meta: {
                startDate,
                endDate,
                generatedAt: new Date()
            }
        });

    } catch (error) {
        console.error('Operator Reports GET Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
