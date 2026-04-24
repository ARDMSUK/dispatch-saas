import { NextResponse } from "next/server";
import { auth } from "@/auth";

export async function GET(req: Request) {
    try {
        const session = await auth();
        if (!session?.user?.tenantId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        if (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN') {
            return NextResponse.json({ error: "Forbidden: Admins only" }, { status: 403 });
        }

        const clientId = process.env.SUMUP_CLIENT_ID || 'dummy-client-id';
        const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/integrations/sumup/callback`;
        const state = session.user.tenantId;

        // Redirect to SumUp OAuth page
        const sumupAuthUrl = `https://api.sumup.com/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=payments.read%20payments.write&state=${state}`;

        return NextResponse.redirect(sumupAuthUrl);
    } catch (error) {
        console.error("GET /api/integrations/sumup/connect error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
