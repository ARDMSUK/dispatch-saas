import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const session = await auth();
        if (!session?.user?.tenantId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const tenantId = session.user.tenantId;

        // Fetch recent updates from active schemas to display as audit activity
        const [jobs, drivers, vehicles, zones, contracts] = await Promise.all([
            prisma.job.findMany({
                where: { tenantId },
                orderBy: { updatedAt: 'desc' },
                take: 15,
                select: { id: true, passengerName: true, status: true, updatedAt: true }
            }),
            prisma.driver.findMany({
                where: { tenantId },
                orderBy: { updatedAt: 'desc' },
                take: 10,
                select: { id: true, name: true, callsign: true, updatedAt: true }
            }),
            prisma.vehicle.findMany({
                where: { tenantId },
                orderBy: { updatedAt: 'desc' },
                take: 10,
                select: { id: true, make: true, model: true, registration: true, updatedAt: true }
            }),
            prisma.zone.findMany({
                where: { tenantId },
                orderBy: { updatedAt: 'desc' },
                take: 5,
                select: { id: true, name: true, updatedAt: true }
            }),
            prisma.contract.findMany({
                where: { tenantId },
                orderBy: { updatedAt: 'desc' },
                take: 5,
                select: { id: true, name: true, reference: true, updatedAt: true }
            })
        ]);

        const events: any[] = [];

        jobs.forEach(j => {
            events.push({
                id: `job-${j.id}-${j.updatedAt.getTime()}`,
                type: 'Booking',
                action: 'Job Transitioned',
                description: `TRIP-${j.id} for passenger ${j.passengerName} was updated/saved to status: ${j.status}.`,
                timestamp: j.updatedAt.toISOString()
            });
        });

        drivers.forEach(d => {
            events.push({
                id: `driver-${d.id}-${d.updatedAt.getTime()}`,
                type: 'Driver Profile',
                action: 'Profile Updated',
                description: `Driver ${d.name} (Callsign: ${d.callsign}) was registered or profile modified.`,
                timestamp: d.updatedAt.toISOString()
            });
        });

        vehicles.forEach(v => {
            events.push({
                id: `vehicle-${v.id}-${v.updatedAt.getTime()}`,
                type: 'Vehicle Record',
                action: 'Record Modified',
                description: `Vehicle record for ${v.make} ${v.model} (${v.registration}) was updated.`,
                timestamp: v.updatedAt.toISOString()
            });
        });

        zones.forEach(z => {
            events.push({
                id: `zone-${z.id}-${z.updatedAt.getTime()}`,
                type: 'Pricing Zone',
                action: 'Geofence Edited',
                description: `Pricing Zone '${z.name}' coordinates or color details were modified.`,
                timestamp: z.updatedAt.toISOString()
            });
        });

        contracts.forEach(c => {
            events.push({
                id: `contract-${c.id}-${c.updatedAt.getTime()}`,
                type: 'Contract Run',
                action: 'Contract Managed',
                description: `Local Authority Contract '${c.name}' (Reference: ${c.reference}) was modified.`,
                timestamp: c.updatedAt.toISOString()
            });
        });

        // Sort events reverse-chronologically by timestamp
        events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        return NextResponse.json(events.slice(0, 50));
    } catch (error) {
        console.error('Failed to compile audit logs:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
