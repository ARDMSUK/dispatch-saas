import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export async function GET() {
    try {
        const session = await auth();
        if (!session?.user?.tenantId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const drivers = await prisma.driver.findMany({
            where: { tenantId: session.user.tenantId },
            include: {
                vehicles: true // Include assigned vehicles
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
        const session = await auth();
        if (!session?.user?.tenantId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        if (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN') {
            return NextResponse.json({ error: "Forbidden: Admins only" }, { status: 403 });
        }

        const body = await req.json();
        const { name, callsign, phone, email, badgeNumber, licenseExpiry, pin } = body;

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
                tenantId: session.user.tenantId,
                status: 'OFF_DUTY',
            }
        });

        return NextResponse.json(driver);

    } catch (error) {
        console.error("POST /api/drivers error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
