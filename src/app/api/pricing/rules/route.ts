
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

        const rules = await prisma.pricingRule.findMany({
            where: { tenantId: session.user.tenantId },
            orderBy: { vehicleType: 'asc' }
        });

        return NextResponse.json(rules);
    } catch (error) {
        console.error("GET /api/pricing/rules error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const session = await auth();
        if (!session?.user?.tenantId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        if (session.user.role !== 'ADMIN') {
            return NextResponse.json({ error: "Forbidden: Admins only" }, { status: 403 });
        }

        const body = await req.json();
        const { vehicleType, baseRate, perMile, minFare } = body;

        if (!vehicleType) {
            return NextResponse.json({ error: "Vehicle Type required" }, { status: 400 });
        }

        // Upsert based on Tenant + VehicleType
        const rule = await prisma.pricingRule.upsert({
            where: {
                tenantId_vehicleType: {
                    tenantId: session.user.tenantId,
                    vehicleType: vehicleType
                }
            },
            update: {
                baseRate: body.baseRate,
                perMile: body.perMile,
                minFare: body.minFare,
                waitingFreq: body.waitingFreq
            },
            create: {
                tenantId: session.user.tenantId,
                name: `${body.vehicleType} Tariff`,
                vehicleType: body.vehicleType,
                baseRate: body.baseRate,
                perMile: body.perMile,
                minFare: body.minFare,
                waitingFreq: body.waitingFreq
            }
        });

        return NextResponse.json(rule);

    } catch (error) {
        console.error("POST /api/pricing/rules error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
