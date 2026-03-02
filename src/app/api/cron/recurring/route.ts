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

        const now = new Date();
        const next48Hours = new Date(now.getTime() + 48 * 60 * 60 * 1000);

        // Find all "Template" jobs. (The original booking that sparked the recurrence)
        // A template job is any active Job where isRecurring=true and recurrenceEnd is either null, or > now.
        const templates = await prisma.job.findMany({
            where: {
                isRecurring: true,
                recurrenceGroupId: { not: null },
                OR: [
                    { recurrenceEnd: null },
                    { recurrenceEnd: { gte: now } }
                ]
            }
        });

        if (templates.length === 0) {
            return NextResponse.json({ message: "No recurring templates active." });
        }

        let jobsCreated = 0;

        for (const template of templates) {
            // We only look at rules like: "DAILY", "WEEKLY", "MON,WED,FRI"
            const rule = template.recurrenceRule?.toUpperCase() || "";
            const groupId = template.recurrenceGroupId!;

            // Determine target dates within the next 48 hours for this template
            const targetDates: Date[] = [];

            // Loop day by day for the next 48h window
            for (let i = 0; i < 3; i++) { // Check today, tomorrow, and day after
                const testDate = new Date(now);
                testDate.setDate(now.getDate() + i);

                // Keep the exact same time as the template pickup
                testDate.setHours(template.pickupTime.getHours(), template.pickupTime.getMinutes(), 0, 0);

                // Stop if we bypass 48 hours or hit recurrenceEnd limit
                if (testDate > next48Hours) break;
                if (template.recurrenceEnd && testDate > template.recurrenceEnd) break;
                if (testDate < now) continue; // Past time today

                let shouldGenerate = false;
                if (rule === 'DAILY') {
                    shouldGenerate = true;
                } else if (rule === 'WEEKLY') {
                    if (testDate.getDay() === template.pickupTime.getDay()) shouldGenerate = true;
                } else if (rule.includes(',')) {
                    // E.g. "1,3,5" for Mon,Wed,Fri (where 0=Sun)
                    const allowedDays = rule.split(',').map(d => parseInt(d.trim()));
                    if (allowedDays.includes(testDate.getDay())) shouldGenerate = true;
                }

                if (shouldGenerate) {
                    targetDates.push(testDate);
                }
            }

            // For each valid target date, ensure we haven't already created a Job for it
            for (const tDate of targetDates) {
                const existing = await prisma.job.findFirst({
                    where: {
                        recurrenceGroupId: groupId,
                        pickupTime: tDate
                    }
                });

                if (!existing) {
                    // Build new job
                    const { id, isRecurring, recurrenceRule, recurrenceEnd, isReturn, returnJobId, parentJobId, bookedAt, ...jobData } = template as any;

                    await prisma.job.create({
                        data: {
                            ...jobData,
                            pickupTime: tDate,
                            status: 'PENDING',
                            // The clones are not "recurring" masters, they just belong to the group
                            isRecurring: false,
                            recurrenceGroupId: groupId
                        }
                    });
                    jobsCreated++;
                }
            }
        }

        return NextResponse.json({
            success: true,
            message: `Scanned ${templates.length} templates. Created ${jobsCreated} upcoming jobs.`
        });

    } catch (error) {
        console.error("Cron Recurring Jobs error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
