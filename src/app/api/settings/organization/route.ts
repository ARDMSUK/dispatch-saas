
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// GET: Fetch current organization details
export async function GET(req: Request) {
    try {
        const session = await auth();
        if (!session?.user?.tenantId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const tenant = await prisma.tenant.findUnique({
            where: { id: session.user.tenantId }
        });

        if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

        return NextResponse.json(tenant);
    } catch (error) {
        console.error("GET /api/settings/organization error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

// PATCH: Update organization details
export async function PATCH(req: Request) {
    try {
        const session = await auth();
        if (!session?.user?.tenantId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        if (session.user.role !== 'ADMIN') {
            return NextResponse.json({ error: "Forbidden: Admins only" }, { status: 403 });
        }

        const body = await req.json();
        const { name, email, phone, address, lat, lng, useZonePricing, autoDispatch } = body;

        // Validation: Ensure required fields if needed, but schema allows optional

        const updatedTenant = await prisma.tenant.update({
            where: { id: session.user.tenantId },
            data: {
                name,
                email,
                phone,
                address,
                lat,
                lng,
                useZonePricing: body.useZonePricing,
                autoDispatch: body.autoDispatch
            }
        });

        return NextResponse.json(updatedTenant);

    } catch (error: any) {
        console.error("PATCH /api/settings/organization error:", error);
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}
