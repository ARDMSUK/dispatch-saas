
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    try {
        const session = await auth();
        if (!session?.user?.tenantId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const surcharges = await prisma.surcharge.findMany({
            where: { tenantId: session.user.tenantId },
            orderBy: { name: 'asc' }
        });

        return NextResponse.json(surcharges);
    } catch (error) {
        console.error("GET /api/pricing/surcharges error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const session = await auth();
        if (!session?.user?.tenantId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        if (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN') {
            return NextResponse.json({ error: "Forbidden: Admins only" }, { status: 403 });
        }

        const body = await req.json();
        /* 
           Expected Body:
           {
               name: "Xmas",
               type: "PERCENT" | "FLAT",
               value: 50,
               startDate, endDate, startTime, endTime, daysOfWeek
           }
        */

        const { name, type, value, ...modifiers } = body;

        const surcharge = await prisma.surcharge.create({
            data: {
                tenantId: session.user.tenantId,
                name,
                type: type || 'PERCENT',
                value: parseFloat(value),
                ...modifiers
            }
        });

        return NextResponse.json(surcharge);

    } catch (error) {
        console.error("POST /api/pricing/surcharges error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
