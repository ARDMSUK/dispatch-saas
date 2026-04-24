import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const { searchParams } = new URL(request.url);
    const driverId = searchParams.get('driverId');
    const vehicleId = searchParams.get('vehicleId');

    const documents = await prisma.document.findMany({
      where: {
        tenantId: session.user.tenantId,
        ...(driverId && { driverId }),
        ...(vehicleId && { vehicleId }),
      },
      include: {
        driver: { select: { id: true, name: true, callsign: true } },
        vehicle: { select: { id: true, reg: true, make: true, model: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(documents);
  } catch (error) {
    console.error("Error fetching documents:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN') {
        return NextResponse.json({ error: "Forbidden: Admins only" }, { status: 403 });
    }

    const body = await request.json();
    const { type, fileUrl, expiryDate, status, notes, driverId, vehicleId } = body;

    if (!type) {
        return NextResponse.json({ error: "Type is required" }, { status: 400 });
    }

    if (!driverId && !vehicleId) {
        return NextResponse.json({ error: "Must belong to driver or vehicle" }, { status: 400 });
    }

    const document = await prisma.document.create({
      data: {
        tenantId: session.user.tenantId,
        type,
        fileUrl,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        status: status || "PENDING",
        notes,
        ...(driverId && { driverId }),
        ...(vehicleId && { vehicleId }),
      }
    });

    return NextResponse.json(document);
  } catch (error) {
    console.error("Error creating document:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
