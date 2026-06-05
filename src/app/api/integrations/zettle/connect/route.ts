import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
    try {
        const session = await auth();
        if (!session?.user?.tenantId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        if (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN') {
            return NextResponse.json({ error: "Forbidden: Admins only" }, { status: 403 });
        }

        const tenant = await prisma.tenant.findUnique({
            where: { id: session.user.tenantId }
        });

        const clientId = tenant?.zettleClientId || process.env.ZETTLE_CLIENT_ID;
        const origin = new URL(req.url).origin;
        const redirectUri = `${origin}/api/integrations/zettle/callback`;
        const state = session.user.tenantId;

        if (!clientId) {
            return NextResponse.redirect(`${origin}/dashboard/settings?error=Missing_Zettle_Client_ID`);
        }

        // If client ID is missing or is dummy, redirect directly to our local callback to simulate a successful connection
        if (clientId === 'dummy-zettle-client-id' || clientId.startsWith('mock') || clientId.startsWith('dummy')) {
            return NextResponse.redirect(`${redirectUri}?code=mock_zettle_code&state=${state}`);
        }

        // Redirect to Zettle OAuth page
        const zettleAuthUrl = `https://oauth.zettle.com/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;

        return NextResponse.redirect(zettleAuthUrl);
    } catch (error) {
        console.error("GET /api/integrations/zettle/connect error:", error);
        return NextResponse.redirect(`${new URL(req.url).origin}/dashboard/settings?error=Internal_Server_Error`);
    }
}
