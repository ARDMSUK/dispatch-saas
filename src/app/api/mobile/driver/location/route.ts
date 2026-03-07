import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { verifyMobileToken } from "@/lib/mobile-auth";

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
        const authHeader = req.headers.get("Authorization");
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Missing or invalid authorization token" }, { status: 401, headers: corsHeaders });
        }

        const token = authHeader.split(" ")[1];
        const payload = await verifyMobileToken(token);

        if (!payload || !payload.driverId) {
            return NextResponse.json({ error: "Invalid token" }, { status: 401, headers: corsHeaders });
        }

        const { locations } = await req.json();

        const latestLocation = Array.isArray(locations) && locations.length > 0
            ? locations[locations.length - 1]
            : locations;

        if (!latestLocation || typeof latestLocation.coords?.latitude !== 'number') {
            return NextResponse.json({ error: "Invalid location data format" }, { status: 400, headers: corsHeaders });
        }

        const lat = latestLocation.coords.latitude;
        const lng = latestLocation.coords.longitude;
        const heading = latestLocation.coords.heading;
        const speed = latestLocation.coords.speed;
        const timestamp = latestLocation.timestamp || Date.now();

        await prisma.driver.update({
            where: { id: payload.driverId as string },
            data: {
                location: JSON.stringify({
                    lat,
                    lng,
                    heading,
                    speed,
                    timestamp,
                }),
            },
        });

        return NextResponse.json({ success: true, timestamp }, { headers: corsHeaders });
    } catch (error: any) {
        console.error("Mobile driver location update error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500, headers: corsHeaders }
        );
    } finally {
        await prisma.$disconnect();
    }
}
