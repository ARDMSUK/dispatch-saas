import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

// GET /api/admin/tenants/[id]
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const session = await auth();
        if (session?.user?.role !== 'SUPER_ADMIN') {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const tenant = await prisma.tenant.findUnique({
            where: { id }
        });

        if (!tenant) {
            return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
        }

        return NextResponse.json(tenant);
    } catch (error) {
        console.error("[ADMIN_TENANT_GET_ERROR]", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

// PUT /api/admin/tenants/[id]
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const session = await auth();
        if (session?.user?.role !== 'SUPER_ADMIN') {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const body = await req.json();
        const {
            name, email, phone, address,
            stripeSecretKey, stripePublishableKey,
            twilioAccountSid, twilioAuthToken, twilioFromNumber,
            resendApiKey, aviationStackApiKey
        } = body;

        const updatedTenant = await prisma.tenant.update({
            where: { id },
            data: {
                name, email, phone, address,
                stripeSecretKey, stripePublishableKey,
                twilioAccountSid, twilioAuthToken, twilioFromNumber,
                resendApiKey, aviationStackApiKey
            }
        });

        return NextResponse.json(updatedTenant);
    } catch (error) {
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

// DELETE /api/admin/tenants/[id]
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const session = await auth();
        if (session?.user?.role !== 'SUPER_ADMIN') {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const tenant = await prisma.tenant.findUnique({
            where: { id }
        });

        if (!tenant) {
            return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
        }

        // Must delete all related records in a transaction to avoid orphaned data/foreign key constraints
        await prisma.$transaction(async (tx) => {
            await tx.job.deleteMany({ where: { tenantId: id } });
            await tx.driver.deleteMany({ where: { tenantId: id } });
            await tx.vehicle.deleteMany({ where: { tenantId: id } });

            // Delete pricing dependencies
            await tx.pricingRule.deleteMany({ where: { tenantId: id } });
            await tx.surcharge.deleteMany({ where: { tenantId: id } });
            await tx.fixedPrice.deleteMany({ where: { tenantId: id } });
            await tx.zone.deleteMany({ where: { tenantId: id } });

            // Delete customer architecture
            await tx.customer.deleteMany({ where: { tenantId: id } });
            await tx.account.deleteMany({ where: { tenantId: id } });

            // Delete admin users scoped to this tenant
            await tx.user.deleteMany({ where: { tenantId: id } });

            // Finally delete the tenant record itself
            await tx.tenant.delete({ where: { id } });
        });

        return NextResponse.json({ success: true, message: "Tenant deleted" });

    } catch (error) {
        console.error("[ADMIN_TENANT_DELETE_ERROR]", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
