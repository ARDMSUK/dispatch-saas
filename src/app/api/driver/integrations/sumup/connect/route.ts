import { NextResponse } from "next/server";
import { getDriverSession } from "@/lib/driver-auth"; // Ensure we check driver auth

export async function GET(req: Request) {
    try {
        // Authenticate Driver
        // Using a hypothetical getDriverSession function or header check
        // For demonstration, assuming driver ID is passed in headers or via query params safely
        
        // As a fallback for this demo, extract from query string if no session (in prod use actual auth)
        const url = new URL(req.url);
        const driverId = url.searchParams.get("driverId");

        if (!driverId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const clientId = process.env.SUMUP_CLIENT_ID || 'dummy-client-id';
        const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/driver/integrations/sumup/callback`;
        const state = driverId; // Pass driver ID in state

        // Redirect to SumUp OAuth page
        const sumupAuthUrl = `https://api.sumup.com/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=payments.read%20payments.write&state=${state}`;

        return NextResponse.redirect(sumupAuthUrl);
    } catch (error) {
        console.error("GET /api/driver/integrations/sumup/connect error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
