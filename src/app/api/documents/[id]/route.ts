import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN') {
        return NextResponse.json({ error: "Forbidden: Admins only" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { type, fileUrl, expiryDate, status, notes } = body;

    const existing = await prisma.document.findUnique({
      where: { id: id, tenantId: session.user.tenantId }
    });

    if (!existing) {
       return NextResponse.json({ error: "Not Found" }, { status: 404 });
    }

    const document = await prisma.document.update({
      where: { id: id },
      data: {
        ...(type !== undefined && { type }),
        ...(fileUrl !== undefined && { fileUrl }),
        ...(expiryDate !== undefined && { expiryDate: expiryDate ? new Date(expiryDate) : null }),
        ...(status !== undefined && { status }),
        ...(notes !== undefined && { notes })
      }
    });

    return NextResponse.json(document);
  } catch (error) {
    console.error("Error updating document:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN') {
        return NextResponse.json({ error: "Forbidden: Admins only" }, { status: 403 });
    }

    const { id } = await params;
    const existing = await prisma.document.findUnique({
      where: { id: id, tenantId: session.user.tenantId }
    });

    if (!existing) {
       return NextResponse.json({ error: "Not Found" }, { status: 404 });
    }

    await prisma.document.delete({
      where: { id: id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting document:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
