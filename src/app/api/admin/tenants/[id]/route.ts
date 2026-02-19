import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

// GET /api/admin/tenants/[id]
export async function GET(req: Request, { params }: { params: { id: string } }) {
    try {
        const session = await auth();
        if (session?.user?.role !== 'SUPER_ADMIN') {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const tenant = await prisma.tenant.findUnique({
            where: { id: params.id }
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
export async function PUT(req: Request, { params }: { params: { id: string } }) {
    try {
        const session = await auth();
        if (session?.user?.role !== 'SUPER_ADMIN') {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const body = await req.json();
        const {
            name, email, phone, address,
            stripeSecretKey, stripePublishableKey,
            twilioAccountSid, twilioAuthToken, twilioFromNumber,
            resendApiKey
        } = body;

        const updatedTenant = await prisma.tenant.update({
            where: { id: params.id },
            data: {
                name, email, phone, address,
                stripeSecretKey, stripePublishableKey,
                twilioAccountSid, twilioAuthToken, twilioFromNumber,
                resendApiKey
            }
        });

        return NextResponse.json(updatedTenant);
    } catch (error) {
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
