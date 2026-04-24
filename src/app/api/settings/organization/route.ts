
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

        // Strip sensitive keys if user is not an admin
        const isAdmin = session.user.role === 'ADMIN' || session.user.role === 'SUPER_ADMIN';
        const safeTenant = { ...tenant };

        if (!isAdmin) {
            delete (safeTenant as any).apiKey;
            delete (safeTenant as any).stripeSecretKey;
            delete (safeTenant as any).stripePublishableKey;
            delete (safeTenant as any).twilioAccountSid;
            delete (safeTenant as any).twilioAuthToken;
            delete (safeTenant as any).twilioSubaccountId;
            delete (safeTenant as any).resendApiKey;
            delete (safeTenant as any).aviationStackApiKey;
        }

        return NextResponse.json(safeTenant);
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

        if (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN') {
            return NextResponse.json({ error: "Forbidden: Admins only" }, { status: 403 });
        }

        const body = await req.json();
        const { name, email, phone, address, lat, lng, useZonePricing, autoDispatch, enableDynamicPricing, enableWaitCalculations, enableWebBooker } = body;

        // Validation: Ensure required fields if needed, but schema allows optional

        const updateData: any = {
            name,
            email,
            phone,
            address,
            lat,
            lng,
            useZonePricing: body.useZonePricing,
            autoDispatch: body.autoDispatch,
            enableLiveTracking: body.enableLiveTracking,
            dispatchAlgorithm: body.dispatchAlgorithm,
            enableDynamicPricing: typeof body.enableDynamicPricing === 'boolean' ? body.enableDynamicPricing : undefined,
            enableWaitCalculations: typeof body.enableWaitCalculations === 'boolean' ? body.enableWaitCalculations : undefined,
            enableWebBooker: typeof body.enableWebBooker === 'boolean' ? body.enableWebBooker : undefined,
            logoUrl: body.logoUrl !== undefined ? body.logoUrl : undefined,
            brandColor: body.brandColor !== undefined ? body.brandColor : undefined,
            consoleLayout: body.consoleLayout !== undefined ? body.consoleLayout : undefined,
            stripePublishableKey: body.stripePublishableKey !== undefined ? body.stripePublishableKey : undefined,
            stripeSecretKey: body.stripeSecretKey !== undefined ? body.stripeSecretKey : undefined,
            twilioFromNumber: body.twilioFromNumber !== undefined ? body.twilioFromNumber : undefined,
            paymentRouting: body.paymentRouting !== undefined ? body.paymentRouting : undefined
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
