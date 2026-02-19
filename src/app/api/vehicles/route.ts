import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export async function GET() {
    try {
        const session = await auth();
        if (!session?.user?.tenantId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const vehicles = await prisma.vehicle.findMany({
            where: { tenantId: session.user.tenantId },
            include: {
                driver: true
            },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json(vehicles);
    } catch (error) {
        console.error("GET /api/vehicles error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const session = await auth();
        if (!session?.user?.tenantId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        if (session.user.role !== 'ADMIN') {
            return NextResponse.json({ error: "Forbidden: Admins only" }, { status: 403 });
        }

        const body = await req.json();
        const { reg, make, model, type, color, expiryDate } = body;

        if (!reg || !model || !type) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const vehicle = await prisma.vehicle.create({
            data: {
                reg,
                model,
                make: make || "Unknown",
                type,
                color,
                expiryDate: expiryDate ? new Date(expiryDate) : null,
                tenantId: session.user.tenantId,
            }
        });

        return NextResponse.json(vehicle);
    } catch (error) {
        console.error("POST /api/vehicles error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
