
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { requireTenantAdmin } from "@/utils/rbac";

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session?.user?.tenantId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
    const { error: rbacError } = await requireTenantAdmin();
    if (rbacError) return rbacError;

        const { id } = await params;

        await prisma.surcharge.delete({
            where: {
                id,
                tenantId: session.user.tenantId
            }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("DELETE /api/pricing/surcharges/[id] error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
