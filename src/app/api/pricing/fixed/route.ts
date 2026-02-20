
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

        const fixedPrices = await prisma.fixedPrice.findMany({
            where: { tenantId: session.user.tenantId },
            orderBy: { name: 'asc' }
        });

        return NextResponse.json(fixedPrices);
    } catch (error) {
        console.error("GET /api/pricing/fixed error:", error);
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
               name: "LHR T5",
               pickup: "London", // partial match string or full address
               dropoff: "Heathrow Terminal 5",
               price: 60.00,
               vehicleType: "Saloon",
               isReverse: true
           }
        */

        const { name, pickup, dropoff, price, vehicleType, isReverse } = body;

        const fixedPrice = await prisma.fixedPrice.create({
            data: {
                tenantId: session.user.tenantId,
                name,
                pickup,
                dropoff,
                price: parseFloat(price),
                vehicleType: vehicleType || 'Saloon',
                isReverse: isReverse ?? true
            }
        });

        return NextResponse.json(fixedPrice);

    } catch (error) {
        console.error("POST /api/pricing/fixed error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
