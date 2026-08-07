import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { hash } from 'bcryptjs';
import { requireTenantAdmin } from "@/utils/rbac";

// PATCH /api/users/[id]
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await auth();
        if (!session?.user?.tenantId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const { error: rbacError } = await requireTenantAdmin();
        if (rbacError) return rbacError;
        
        const { id } = await params;
        const body = await req.json();
        const { name, role, password, permissions, sipExtension } = body;

        const targetUser = await prisma.user.findUnique({ where: { id } });
        if (!targetUser || targetUser.tenantId !== session.user.tenantId) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        if (targetUser.role === 'SUPER_ADMIN') {
            return NextResponse.json({ error: "Forbidden: Cannot modify SUPER_ADMIN" }, { status: 403 });
        }

        const updateData: any = {};
        if (name) updateData.name = name;
        if (role) {
            if (role === 'SUPER_ADMIN') {
                return NextResponse.json({ error: "Forbidden: Cannot promote to SUPER_ADMIN" }, { status: 403 });
            }
            const ALLOWED_ROLES = ["ADMIN", "DISPATCHER", "DRIVER", "B2B_ADMIN"];
            if (!ALLOWED_ROLES.includes(role)) {
                return NextResponse.json({ error: "Invalid or unsupported role" }, { status: 400 });
            }
            updateData.role = role;
        }
        if (permissions !== undefined) updateData.permissions = Array.isArray(permissions) ? permissions : [];
        if (sipExtension !== undefined) updateData.sipExtension = sipExtension || null;
        if (password) {
            updateData.password = await hash(password, 12);
        }

        const user = await prisma.user.update({
            where: { id },
            data: updateData,
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                sipExtension: true,
                permissions: true
            }
        });

        const { logAuditEvent } = await import('@/lib/audit-logger');
        await logAuditEvent({
            tenantId: session.user.tenantId,
            userId: session.user.id,
            action: 'UPDATE_USER_ROLE',
            resource: 'User',
            resourceId: id,
            details: { ...body }
        });

        return NextResponse.json(user);

    } catch (error) {
        console.error("PATCH /api/users/[id] error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

// DELETE /api/users/[id]
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await auth();
        if (!session?.user?.tenantId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const { error: rbacError } = await requireTenantAdmin();
        if (rbacError) return rbacError;
        
        const { id } = await params;

        const targetUser = await prisma.user.findUnique({ where: { id } });
        if (!targetUser || targetUser.tenantId !== session.user.tenantId) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        if (targetUser.role === 'SUPER_ADMIN') {
            return NextResponse.json({ error: "Forbidden: Cannot delete SUPER_ADMIN" }, { status: 403 });
        }

        // Prevent self-deletion
        if (id === session.user.id) {
            return NextResponse.json({ error: "You cannot delete your own account." }, { status: 400 });
        }

        await prisma.user.delete({
            where: { id }
        });

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error("DELETE /api/users/[id] error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
