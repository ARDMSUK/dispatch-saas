import { NextRequest, NextResponse } from "next/server";
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export async function GET(req: NextRequest) {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const tenantId = session.user.tenantId;

    const { searchParams } = new URL(req.url);
    const phone = searchParams.get("phone");

    if (phone) {
        // Find existing customer by phone within tenant
        const customer = await prisma.customer.findUnique({
            where: {
                tenantId_phone: {
                    tenantId,
                    phone
                }
            },
            include: { account: true }
        });
        return NextResponse.json({ customer: customer || null });
    }

    // List recent customers? Or just empty for now if no query
    const customers = await prisma.customer.findMany({
        where: { tenantId },
        take: 10,
        orderBy: { updatedAt: 'desc' }
    });

    return NextResponse.json({ customers });
}
