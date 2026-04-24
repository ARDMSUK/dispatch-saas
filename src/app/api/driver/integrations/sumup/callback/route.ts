import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
    try {
        const url = new URL(req.url);
        const code = url.searchParams.get("code");
        const state = url.searchParams.get("state"); // This is the driverId

        if (!code || !state) {
            // Usually redirect to driver app deep link
            return NextResponse.redirect(`dispatch-driver-app://settings?error=Invalid_OAuth_Callback`);
        }

        const driverId = state;

        // Exchange code for token
        const dummyAccessToken = `sumup_drv_at_${Math.random().toString(36).substring(7)}`;
        const dummyRefreshToken = `sumup_drv_rt_${Math.random().toString(36).substring(7)}`;

        await prisma.driver.update({
            where: { id: driverId },
            data: {
                sumupAccessToken: dummyAccessToken,
                sumupRefreshToken: dummyRefreshToken,
                sumupTokenExpiry: new Date(Date.now() + 3600 * 1000)
            }
        });

        // Redirect back to driver app via deep link
        return NextResponse.redirect(`dispatch-driver-app://settings?success=sumup_connected`);
    } catch (error) {
        console.error("GET /api/driver/integrations/sumup/callback error:", error);
        return NextResponse.redirect(`dispatch-driver-app://settings?error=Internal_Server_Error`);
    }
}
