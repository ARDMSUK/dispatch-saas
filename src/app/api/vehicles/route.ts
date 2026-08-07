import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { requireTenantAdmin } from "@/utils/rbac";

export async function GET() {
    try {
        const session = await auth();
        if (!session?.user?.tenantId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
    const { error: rbacError } = await requireTenantAdmin();
    if (rbacError) return rbacError;

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
        const { error: rbacError } = await requireTenantAdmin();
        if (rbacError) return rbacError;
        const body = await req.json();
        const { reg, make, model, type, color, expiryDate } = body;

        if (!reg || !model || !type) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const normalizedReg = reg.trim().toUpperCase().replace(/\s+/g, '');

        const vehicle = await prisma.vehicle.create({
            data: {
                reg: normalizedReg,
                model,
                make: make || "Unknown",
                type,
                color,
                expiryDate: expiryDate ? new Date(expiryDate) : null,
                tenantId: session.user.tenantId,
            }
        });

        return NextResponse.json(vehicle);
    } catch (error: any) {
        if (error.code === 'P2002') {
            return NextResponse.json({ error: "Vehicle with this registration already exists." }, { status: 409 });
        }
        console.error("POST /api/vehicles error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
