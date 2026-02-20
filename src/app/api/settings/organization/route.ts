
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

        const updateData: any = {
            name,
            email,
            phone,
            address,
            lat,
            lng,
            useZonePricing: body.useZonePricing,
            autoDispatch: body.autoDispatch
        };

        if ((session.user.role as string) === 'SUPER_ADMIN') {
            if (body.smsTemplateDriverArrived !== undefined) updateData.smsTemplateDriverArrived = body.smsTemplateDriverArrived;
            if (body.smsTemplateConfirmation !== undefined) updateData.smsTemplateConfirmation = body.smsTemplateConfirmation;
            if (body.smsTemplateDriverAssigned !== undefined) updateData.smsTemplateDriverAssigned = body.smsTemplateDriverAssigned;
            if (body.emailSubjectConfirmation !== undefined) updateData.emailSubjectConfirmation = body.emailSubjectConfirmation;
            if (body.emailBodyConfirmation !== undefined) updateData.emailBodyConfirmation = body.emailBodyConfirmation;
            if (body.emailSubjectDriverAssigned !== undefined) updateData.emailSubjectDriverAssigned = body.emailSubjectDriverAssigned;
            if (body.emailBodyDriverAssigned !== undefined) updateData.emailBodyDriverAssigned = body.emailBodyDriverAssigned;
            if (body.emailSubjectDriverArrived !== undefined) updateData.emailSubjectDriverArrived = body.emailSubjectDriverArrived;
            if (body.emailBodyDriverArrived !== undefined) updateData.emailBodyDriverArrived = body.emailBodyDriverArrived;
            if (body.emailSubjectReceipt !== undefined) updateData.emailSubjectReceipt = body.emailSubjectReceipt;
            if (body.emailBodyReceipt !== undefined) updateData.emailBodyReceipt = body.emailBodyReceipt;
        }

        const updatedTenant = await prisma.tenant.update({
            where: { id: session.user.tenantId },
            data: updateData
        });

        return NextResponse.json(updatedTenant);

    } catch (error: any) {
        console.error("PATCH /api/settings/organization error:", error);
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}
