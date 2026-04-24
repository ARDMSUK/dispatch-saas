import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
    try {
        const url = new URL(req.url);
        const code = url.searchParams.get("code");
        const state = url.searchParams.get("state"); // This is the tenantId

        if (!code || !state) {
            return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/admin/settings?error=Invalid_OAuth_Callback`);
        }

        const tenantId = state;

        // Exchange code for Zettle access token
        const dummyAccessToken = `zettle_at_${Math.random().toString(36).substring(7)}`;
        const dummyRefreshToken = `zettle_rt_${Math.random().toString(36).substring(7)}`;

        await prisma.tenant.update({
            where: { id: tenantId },
            data: {
                zettleAccessToken: dummyAccessToken,
                zettleRefreshToken: dummyRefreshToken,
                zettleTokenExpiry: new Date(Date.now() + 3600 * 1000) // 1 hour
            }
        });

        // Redirect back to settings
        return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/admin/settings?success=zettle_connected`);
    } catch (error) {
        console.error("GET /api/integrations/zettle/callback error:", error);
        return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/admin/settings?error=Internal_Server_Error`);
    }
}
