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

        // In a real application, you would exchange the 'code' for an access token
        // using your SUMUP_CLIENT_SECRET.
        // For demonstration, we save dummy tokens.
        const dummyAccessToken = `sumup_at_${Math.random().toString(36).substring(7)}`;
        const dummyRefreshToken = `sumup_rt_${Math.random().toString(36).substring(7)}`;

        await prisma.tenant.update({
            where: { id: tenantId },
            data: {
                sumupAccessToken: dummyAccessToken,
                sumupRefreshToken: dummyRefreshToken,
                sumupTokenExpiry: new Date(Date.now() + 3600 * 1000) // 1 hour
            }
        });

        // Redirect back to settings
        return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/admin/settings?success=sumup_connected`);
    } catch (error) {
        console.error("GET /api/integrations/sumup/callback error:", error);
        return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/admin/settings?error=Internal_Server_Error`);
    }
}
