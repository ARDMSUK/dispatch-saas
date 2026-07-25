import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from "@/utils/rbac";
import { requireActiveTenant } from "@/utils/lockout";

export async function GET() {
    try {
        const { session, error } = await requireActiveTenant('READ');
        if (error) return error;

        const { error: rbacError } = await requireRole("DISPATCHER");
        if (rbacError) return rbacError;

        if (session.user.role === 'B2B_ADMIN') {
             return NextResponse.json({ error: "Forbidden: Access denied" }, { status: 403 });
        }

        const drivers = await prisma.driver.findMany({
            where: { tenantId: session.user.tenantId },
            include: {
                vehicles: true, // Include assigned vehicles
                zoneQueues: {
                    include: {
                        zone: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json(drivers);
    } catch (error) {
        console.error("GET /api/drivers error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const { session, error: lockoutError } = await requireActiveTenant('WRITE');
        if (lockoutError) return lockoutError;

        const { error: rbacError } = await requireRole("ADMIN");
        if (rbacError) return rbacError;

        const body = await req.json();
        const { name, callsign, phone, email, badgeNumber, licenseExpiry, pin, commissionRate } = body;

        if (!name || !callsign || !phone) {
            return NextResponse.json({ error: "Missing required fields (Name, Callsign, Phone)" }, { status: 400 });
        }

        // Check for duplicate callsign
        const existing = await prisma.driver.findFirst({
            where: {
                tenantId: session.user.tenantId,
                callsign: callsign
            }
        });

        if (existing) {
            return NextResponse.json({ error: `Driver with callsign ${callsign} already exists.` }, { status: 409 });
        }

        const driver = await prisma.driver.create({
            data: {
                name,
                callsign,
                phone,
                email,
                badgeNumber,
                licenseExpiry: licenseExpiry ? new Date(licenseExpiry) : null,
                pin,
                commissionRate: commissionRate !== undefined ? commissionRate : 20.0,
                tenantId: session.user.tenantId,
                status: 'OFF_DUTY',
            }
        });

        const { logAuditEvent } = await import('@/lib/audit-logger');
        await logAuditEvent({
            tenantId: session.user.tenantId,
            userId: session.user.id,
            action: 'CREATE_DRIVER',
            resource: 'Driver',
            resourceId: driver.id,
            details: { name: driver.name, callsign: driver.callsign }
        });

        return NextResponse.json(driver);

    } catch (error) {
        console.error("POST /api/drivers error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
