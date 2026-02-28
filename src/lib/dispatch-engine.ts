import { prisma } from '@/lib/prisma';
import { EmailService } from '@/lib/email-service';
import { SmsService } from '@/lib/sms-service';
import { Driver, Job } from '@prisma/client';
import { calculateDistance, isPointInPolygon } from '@/lib/geoutils';

export class DispatchEngine {

    /**
     * Main entry point to run the dispatch loop for a tenant.
     * Finds pending jobs and assigns them to available drivers.
     */
    static async runDispatchLoop(tenantId: string) {
        console.log(`[DispatchEngine] Running for tenant: ${tenantId}`);
        const report = {
            totalPending: 0,
            assigned: 0,
            failed: 0,
            details: [] as string[]
        };

        // 0. Check Tenant Configuration
        const tenant = await prisma.tenant.findUnique({
            where: { id: tenantId },
            select: { autoDispatch: true, dispatchAlgorithm: true }
        });

        if (!tenant?.autoDispatch) {
            console.log(`[DispatchEngine] Auto-dispatch disabled for tenant ${tenantId}`);
            return report;
        }

        // 1. Fetch Zones (for Zone Dispatch)
        const zones = await prisma.zone.findMany({
            where: { tenantId }
        });

        // 2. Find PENDING Jobs (with pickup time in the future or recent past)
        const now = new Date();
        const lookahead = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours
        // Expanded lookback to catch failed assignments from recent past
        const lookback = new Date(now.getTime() - 2 * 60 * 60 * 1000); // 2 hours ago

        const pendingJobs = await prisma.job.findMany({
            where: {
                tenantId: tenantId,
                status: 'PENDING',
                autoDispatch: true,
                pickupTime: {
                    gte: lookback,
                    lte: lookahead
                },
                driverId: null
            },
            orderBy: {
                pickupTime: 'asc'
            },
            include: {
                customer: true
            }
        });

        report.totalPending = pendingJobs.length;

        if (pendingJobs.length === 0) {
            return report;
        }

        // 3. Find Available Drivers and their Queues
        // Strict Mode: Only FREE drivers.
        const availableDrivers = await prisma.driver.findMany({
            where: {
                tenantId: tenantId,
                status: 'FREE',
            },
            include: {
                vehicles: true,
                zoneQueues: true // Include queue data for LONGEST_WAITING logic
            }
        });

        // 4. Match Logic
        const assignedDriverIds = new Set<string>();

        // Pre-parse driver locations
        const driverLocations = availableDrivers.map(d => {
            try {
                const loc = d.location ? JSON.parse(d.location) : null;
                return { ...d, parsedLat: loc?.lat, parsedLng: loc?.lng };
            } catch (e) {
                return { ...d, parsedLat: null, parsedLng: null };
            }
        });

        for (const job of pendingJobs) {
            // Find Job Zone
            let jobZoneId: string | null = null;
            if (job.pickupLat && job.pickupLng) {
                for (const zone of zones) {
                    try {
                        const coords = JSON.parse(zone.coordinates) as [number, number][];
                        if (isPointInPolygon([job.pickupLat, job.pickupLng], coords)) {
                            jobZoneId = zone.id;
                            break;
                        }
                    } catch (e) { console.error(`Zone parse error ${zone.name}`, e); }
                }
            }

            const driver = this.findBestDriver(
                job,
                driverLocations,
                assignedDriverIds,
                jobZoneId,
                zones,
                tenant.dispatchAlgorithm
            );

            if (driver) {
                await this.assignJob(job, driver);
                assignedDriverIds.add(driver.id);
                report.assigned++;
                report.details.push(`Job ${job.id} assigned to ${driver.callsign} (${driver.name})`);
            } else {
                report.failed++;
                report.details.push(`Job ${job.id} could not find a driver.`);
            }
        }

        return report;
    }

    private static findBestDriver(
        job: Job,
        drivers: (Driver & { parsedLat?: number, parsedLng?: number, zoneQueues?: any[] })[],
        excludedIds: Set<string>,
        jobZoneId: string | null,
        zones: any[],
        dispatchAlgorithm: string
    ): Driver | null {
        const candidates = drivers.filter(d => !excludedIds.has(d.id));

        if (candidates.length === 0) return null;

        // 1. Zone Filtering
        let zoneCandidates = candidates;
        if (jobZoneId) {
            // First, see if any drivers are officially in the ZoneQueue for this zone
            const queueMembers = candidates.filter(d =>
                d.zoneQueues?.some(q => q.zoneId === jobZoneId)
            );

            if (queueMembers.length > 0) {
                zoneCandidates = queueMembers;
            } else {
                // Fallback: Check if any drivers are geometrically in the zone even if they missed a queue ping
                const geometricCandidates = candidates.filter(d => {
                    if (!d.parsedLat || !d.parsedLng) return false;
                    const zone = zones.find(z => z.id === jobZoneId);
                    if (!zone) return false;
                    try {
                        const coords = JSON.parse(zone.coordinates);
                        return isPointInPolygon([d.parsedLat, d.parsedLng], coords);
                    } catch { return false; }
                });

                if (geometricCandidates.length > 0) {
                    zoneCandidates = geometricCandidates;
                }
                // If STILL empty, zoneCandidates remains all candidates (fallback to global search)
            }
        }

        // 2. Sorting by Algorithm
        if (dispatchAlgorithm === "LONGEST_WAITING" && jobZoneId) {
            // Sort zoneCandidates by joinedAt ascending (longest waiting first)
            const queueDrivers = zoneCandidates.filter(d => d.zoneQueues && d.zoneQueues.length > 0);

            if (queueDrivers.length > 0) {
                const sortedByQueue = queueDrivers.sort((a, b) => {
                    const queueA = a.zoneQueues!.find(q => q.zoneId === jobZoneId);
                    const queueB = b.zoneQueues!.find(q => q.zoneId === jobZoneId);

                    // If both are in the queue, sort by oldest
                    if (queueA && queueB) {
                        return new Date(queueA.joinedAt).getTime() - new Date(queueB.joinedAt).getTime();
                    }
                    // If only A is in queue, A wins
                    if (queueA) return -1;
                    // If only B is in queue, B wins
                    if (queueB) return 1;
                    return 0;
                });
                return sortedByQueue[0];
            }
            // If we wanted LONGEST_WAITING but nobody is in the queue, fall through to CLOSEST
        }

        // 3. Nearest Calculation (CLOSEST or fallback)
        if (job.pickupLat && job.pickupLng) {
            const sorted = zoneCandidates.sort((a, b) => {
                const distA = this.getDriverDistance(a, job.pickupLat!, job.pickupLng!);
                const distB = this.getDriverDistance(b, job.pickupLat!, job.pickupLng!);
                return distA - distB;
            });
            return sorted[0];
        }

        // Fallback: First available
        return zoneCandidates[0];
    }

    private static getDriverDistance(driver: Driver & { parsedLat?: number, parsedLng?: number }, lat: number, lng: number): number {
        if (driver.parsedLat && driver.parsedLng) {
            return calculateDistance(driver.parsedLat, driver.parsedLng, lat, lng);
        }
        return 999999;
    }

    private static async assignJob(job: any, driver: Driver) {
        // 1. Update Job
        await prisma.job.update({
            where: { id: job.id },
            data: {
                status: 'DISPATCHED',
                driverId: driver.id
            }
        });

        // 2. Update Driver Status
        await prisma.driver.update({
            where: { id: driver.id },
            data: { status: 'BUSY' }
        });

        // 3. Send Notifications
        const tenantSettings = await prisma.tenant.findUnique({ where: { id: job.tenantId } });

        // Email Customer
        await EmailService.sendDriverAssigned(job, driver, tenantSettings).catch(e => console.error("Email err:", e));

        // SMS Customer and Driver
        await SmsService.sendDriverAssigned(job, driver, tenantSettings).catch(e => console.error("SMS pass err:", e));
        await SmsService.sendJobOfferToDriver(job, driver, tenantSettings).catch(e => console.error("SMS drvr err:", e));

        console.log(`[DispatchEngine] Notification sent for Job ${job.id}`);
    }
}
