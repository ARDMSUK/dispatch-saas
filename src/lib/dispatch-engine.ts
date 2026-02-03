import { prisma } from '@/lib/prisma';
import { EmailService } from '@/lib/email-service';
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
            select: { autoDispatch: true }
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

        // 3. Find Available Drivers
        // Strict Mode: Only FREE drivers.
        const availableDrivers = await prisma.driver.findMany({
            where: {
                tenantId: tenantId,
                status: 'FREE',
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

            const driver = this.findBestDriver(job, driverLocations, assignedDriverIds, jobZoneId, zones);

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
        drivers: (Driver & { parsedLat?: number, parsedLng?: number })[],
        excludedIds: Set<string>,
        jobZoneId: string | null,
        zones: any[]
    ): Driver | null {
        const candidates = drivers.filter(d => !excludedIds.has(d.id));

        if (candidates.length === 0) return null;

        // 1. Zone Priority
        let filteredCandidates = candidates;
        if (jobZoneId) {
            const driversInZone = candidates.filter(d => {
                if (!d.parsedLat || !d.parsedLng) return false;
                const zone = zones.find(z => z.id === jobZoneId);
                if (!zone) return false;
                try {
                    const coords = JSON.parse(zone.coordinates);
                    return isPointInPolygon([d.parsedLat, d.parsedLng], coords);
                } catch { return false; }
            });

            if (driversInZone.length > 0) {
                // report? console.log(`[Dispatch] Found ${driversInZone.length} drivers in zone for job ${job.id}`);
                filteredCandidates = driversInZone;
            } else {
                // Fallback to all candidates
                // console.log(`[Dispatch] No drivers in zone for job ${job.id}, falling back.`);
            }
        }

        // 2. Nearest Calculation
        if (job.pickupLat && job.pickupLng) {
            // Sort by distance
            const sorted = filteredCandidates.sort((a, b) => {
                const distA = this.getDriverDistance(a, job.pickupLat!, job.pickupLng!);
                const distB = this.getDriverDistance(b, job.pickupLat!, job.pickupLng!);
                return distA - distB;
            });
            return sorted[0];
        }

        // Fallback: First available
        return filteredCandidates[0];
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
                status: 'ASSIGNED',
                driverId: driver.id
            }
        });

        // 2. Update Driver Status? 
        // Usually we set driver to 'BUSY' immediately so they don't get another job?
        // Yes, for MVP this is safest.
        await prisma.driver.update({
            where: { id: driver.id },
            data: { status: 'BUSY' } // Driver must mark themselves FREE again after job? 
            // Or 'ASSIGNED'? 
            // Let's stick to 'BUSY' for now to block further assignments.
        });

        // 3. Send Notifications
        // Email Customer
        await EmailService.sendDriverAssigned(job, driver);

        // Notify Driver (Push/SMS)? 
        // For now, console log.
        console.log(`[DispatchEngine] Notification sent for Job ${job.id}`);
    }
}
