import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { hash } from 'bcryptjs';

// PATCH /api/users/[id]
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
    try {
        const session = await auth();
        if (!session?.user?.tenantId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        if (session.user.role !== 'ADMIN') {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const { id } = params;
        const body = await req.json();
        const { name, role, password } = body;

        // Prevent modifying own role to lock accidentally?
        // Actually, preventing deleting own account is more critical.

        const updateData: any = {};
        if (name) updateData.name = name;
        if (role) updateData.role = role;
        if (password) {
            updateData.password = await hash(password, 12);
        }

        const user = await prisma.user.update({
            where: {
                id,
                tenantId: session.user.tenantId // Ensure in same tenant
            },
            data: updateData,
            select: {
                id: true,
                name: true,
                email: true,
                role: true
            }
        });

        return NextResponse.json(user);

    } catch (error) {
        console.error("PATCH /api/users/[id] error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

// DELETE /api/users/[id]
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
    try {
        const session = await auth();
        if (!session?.user?.tenantId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        if (session.user.role !== 'ADMIN') {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const { id } = params;

        // Prevent self-deletion
        if (id === session.user.id) {
            return NextResponse.json({ error: "You cannot delete your own account." }, { status: 400 });
        }

        await prisma.user.delete({
            where: {
                id,
                tenantId: session.user.tenantId
            }
        });

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error("DELETE /api/users/[id] error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
