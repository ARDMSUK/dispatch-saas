
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { encrypt, maskSecret, isMaskedValue } from '@/lib/encryption';
import { requireRole } from "@/utils/rbac";
import { requireActiveTenant } from "@/utils/lockout";

// GET: Fetch current organization details
export async function GET(req: Request) {
    try {
        const { session, error } = await requireActiveTenant('READ');
        if (error) return error;
        
        if (!session?.user?.tenantId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const tenant = await prisma.tenant.findUnique({
            where: { id: session.user.tenantId }
        });

        if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

        // Strip sensitive keys if user is not super admin/admin
        const isSuperAdmin = session.user.role === 'SUPER_ADMIN';
        const isAdmin = session.user.role === 'ADMIN' || session.user.role === 'SUPER_ADMIN';
        const safeTenant = { ...tenant };

        if (!isSuperAdmin) {
            delete (safeTenant as any).apiKey;
        }

        // Unconditionally mask secrets so no user (including ADMIN/SUPER_ADMIN) gets raw values
        safeTenant.stripeSecretKey = maskSecret(safeTenant.stripeSecretKey);
        safeTenant.sumupClientSecret = maskSecret(safeTenant.sumupClientSecret);
        safeTenant.zettleClientSecret = maskSecret(safeTenant.zettleClientSecret);

        if (!isAdmin) {
            delete (safeTenant as any).stripePublishableKey;
            delete (safeTenant as any).twilioAccountSid;
            delete (safeTenant as any).twilioAuthToken;
            delete (safeTenant as any).twilioSubaccountId;
            delete (safeTenant as any).resendApiKey;
            delete (safeTenant as any).aviationStackApiKey;
            // Also delete the masked ones to be completely hidden for non-admins
            delete (safeTenant as any).stripeSecretKey;
            delete (safeTenant as any).sumupClientSecret;
            delete (safeTenant as any).zettleClientSecret;
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
        const { session, error: lockoutError } = await requireActiveTenant('WRITE');
        if (lockoutError) return lockoutError;

        const { error: rbacError } = await requireRole("ADMIN");
        if (rbacError) return rbacError;

        if (!session?.user?.tenantId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { name, email, phone, address, lat, lng, useZonePricing, autoDispatch, enableDynamicPricing, enableWaitCalculations, enableWebBooker } = body;

        // Terminal hardware explicitly blocked in Workstream 1
        if (body.sumupClientId || body.sumupClientSecret || body.zettleClientId || body.zettleClientSecret) {
            return NextResponse.json({ error: "Hardware integration is temporarily disabled." }, { status: 400 });
        }

        // Validation: Ensure required fields if needed, but schema allows optional

        // Prevent masked placeholder values from overwriting real secrets
        if (isMaskedValue(body.stripeSecretKey)) delete body.stripeSecretKey;
        if (isMaskedValue(body.sumupClientSecret)) delete body.sumupClientSecret;
        if (isMaskedValue(body.zettleClientSecret)) delete body.zettleClientSecret;

        // Encrypt new values (encrypt returns null for empty string/null)
        if (body.stripeSecretKey !== undefined) body.stripeSecretKey = encrypt(body.stripeSecretKey);
        if (body.sumupClientSecret !== undefined) body.sumupClientSecret = encrypt(body.sumupClientSecret);
        if (body.zettleClientSecret !== undefined) body.zettleClientSecret = encrypt(body.zettleClientSecret);

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
            enableVoiceAi: typeof body.enableVoiceAi === 'boolean' ? body.enableVoiceAi : undefined,
            enableAiCopilot: typeof body.enableAiCopilot === 'boolean' ? body.enableAiCopilot : undefined,
            logoUrl: body.logoUrl !== undefined ? body.logoUrl : undefined,
            brandColor: body.brandColor !== undefined ? body.brandColor : undefined,
            consoleLayout: body.consoleLayout !== undefined ? body.consoleLayout : undefined,
            stripePublishableKey: body.stripePublishableKey !== undefined ? body.stripePublishableKey : undefined,
            stripeSecretKey: body.stripeSecretKey !== undefined ? body.stripeSecretKey : undefined,
            twilioFromNumber: body.twilioFromNumber !== undefined ? body.twilioFromNumber : undefined,
            paymentRouting: body.paymentRouting !== undefined ? body.paymentRouting : undefined,
            aviationStackApiKey: body.aviationStackApiKey !== undefined ? body.aviationStackApiKey : undefined,
            outOfHoursStart: body.outOfHoursStart !== undefined ? body.outOfHoursStart : undefined,
            outOfHoursEnd: body.outOfHoursEnd !== undefined ? body.outOfHoursEnd : undefined,
            // Terminal hardware is explicitly blocked in Workstream 1
            // sumupClientId: body.sumupClientId !== undefined ? body.sumupClientId : undefined,
            // sumupClientSecret: body.sumupClientSecret !== undefined ? body.sumupClientSecret : undefined,
            // zettleClientId: body.zettleClientId !== undefined ? body.zettleClientId : undefined,
            // zettleClientSecret: body.zettleClientSecret !== undefined ? body.zettleClientSecret : undefined
        };

        if (body.disconnectSumup === true) {
            updateData.sumupAccessToken = null;
            updateData.sumupRefreshToken = null;
            updateData.sumupTokenExpiry = null;
        }

        if (body.disconnectZettle === true) {
            updateData.zettleAccessToken = null;
            updateData.zettleRefreshToken = null;
            updateData.zettleTokenExpiry = null;
        }

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

        const { logAuditEvent } = await import('@/lib/audit-logger');
        await logAuditEvent({
            tenantId: session.user.tenantId,
            userId: session.user.id,
            action: 'UPDATE_TENANT_SETTINGS',
            resource: 'Tenant',
            resourceId: session.user.tenantId,
            details: { ...body }
        });

        const safeUpdatedTenant = { ...updatedTenant };
        safeUpdatedTenant.stripeSecretKey = maskSecret(safeUpdatedTenant.stripeSecretKey);
        safeUpdatedTenant.sumupClientSecret = maskSecret(safeUpdatedTenant.sumupClientSecret);
        safeUpdatedTenant.zettleClientSecret = maskSecret(safeUpdatedTenant.zettleClientSecret);

        return NextResponse.json(safeUpdatedTenant);

    } catch (error: any) {
        console.error("PATCH /api/settings/organization error:", error);
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}
