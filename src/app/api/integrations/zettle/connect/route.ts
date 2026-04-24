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

        const clientId = process.env.ZETTLE_CLIENT_ID || 'dummy-zettle-client-id';
        const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/integrations/zettle/callback`;
        const state = session.user.tenantId;

        // Redirect to Zettle OAuth page
        const zettleAuthUrl = `https://oauth.zettle.com/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;

        return NextResponse.redirect(zettleAuthUrl);
    } catch (error) {
        console.error("GET /api/integrations/zettle/connect error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
