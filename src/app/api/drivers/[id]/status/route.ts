import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const session = await auth();
        if (!session?.user?.tenantId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { status } = await req.json();

        // Simple update
        const driver = await prisma.driver.update({
            where: {
                id: id,
                tenantId: session.user.tenantId
            },
            data: { status }
        });

        return NextResponse.json(driver);

    } catch (error) {
        console.error("PATCH driver status error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
