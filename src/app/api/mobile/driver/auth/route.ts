import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { signMobileToken } from "@/lib/mobile-auth";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,OPTIONS,PATCH,DELETE,POST,PUT",
    "Access-Control-Allow-Headers": "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization",
};

export async function OPTIONS() {
    return new Response(null, { status: 204, headers: corsHeaders });
}

export async function POST(req: Request) {
    try {
        const { tenantSlug, callsign, pin } = await req.json();

        if (!tenantSlug || !callsign || !pin) {
            return NextResponse.json(
                { error: "tenantSlug, callsign, and pin are required" },
                { status: 400, headers: corsHeaders }
            );
        }

        const tenant = await prisma.tenant.findUnique({
            where: { slug: tenantSlug },
        });

        if (!tenant) {
            return NextResponse.json({ error: "Tenant not found" }, { status: 404, headers: corsHeaders });
        }

        const driver = await prisma.driver.findUnique({
            where: {
                tenantId_callsign: {
                    tenantId: tenant.id,
                    callsign: callsign,
                },
            },
            include: {
                vehicles: true,
            }
        });

        if (!driver) {
            return NextResponse.json({ error: "Driver not found" }, { status: 404, headers: corsHeaders });
        }

        if (!driver.pin) {
            return NextResponse.json(
                { error: "Driver has not set a PIN. Please contact administration." },
                { status: 401, headers: corsHeaders }
            );
        }

        let isMatched = false;
        if (driver.pin === pin) {
            isMatched = true;
        } else {
            isMatched = await bcrypt.compare(pin, driver.pin);
        }

        if (!isMatched) {
            return NextResponse.json({ error: "Invalid PIN" }, { status: 401, headers: corsHeaders });
        }

        const tokenPayload = {
            tenantId: tenant.id,
            tenantSlug: tenant.slug,
            driverId: driver.id,
            callsign: driver.callsign,
            role: "DRIVER",
        };

        const token = await signMobileToken(tokenPayload);

        return NextResponse.json({
            token,
            driver: {
                id: driver.id,
                callsign: driver.callsign,
                name: driver.name,
                phone: driver.phone,
                status: driver.status,
            },
            tenant: {
                id: tenant.id,
                name: tenant.name,
                slug: tenant.slug,
            }
        }, { headers: corsHeaders });
    } catch (error: any) {
        console.error("Mobile driver auth error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500, headers: corsHeaders }
        );
    } finally {
        await prisma.$disconnect();
    }
}
