import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
    try {
        const url = new URL(req.url);
        const code = url.searchParams.get("code");
        const state = url.searchParams.get("state"); // This is the tenantId

        if (!code || !state) {
            return NextResponse.redirect(`${url.origin}/dashboard/settings?error=Invalid_OAuth_Callback`);
        }

        const tenantId = state;

        const tenant = await prisma.tenant.findUnique({
            where: { id: tenantId }
        });

        if (!tenant) {
            return NextResponse.redirect(`${url.origin}/dashboard/settings?error=Tenant_Not_Found`);
        }

        const clientId = tenant.zettleClientId || process.env.ZETTLE_CLIENT_ID;
        const clientSecret = tenant.zettleClientSecret || process.env.ZETTLE_CLIENT_SECRET;

        let accessToken = `zettle_at_${Math.random().toString(36).substring(7)}`;
        let refreshToken = `zettle_rt_${Math.random().toString(36).substring(7)}`;
        let expiryDate = new Date(Date.now() + 3600 * 1000); // 1 hour

        const isReal = clientId && !clientId.startsWith('dummy') && !clientId.startsWith('mock') && clientSecret;

        if (isReal && code !== 'mock_zettle_code') {
            const tokenRes = await fetch('https://oauth.zettle.com/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: new URLSearchParams({
                    grant_type: 'authorization_code',
                    client_id: clientId!,
                    client_secret: clientSecret!,
                    code: code,
                    redirect_uri: `${url.origin}/api/integrations/zettle/callback`
                })
            });

            if (!tokenRes.ok) {
                const errText = await tokenRes.text();
                console.error("Zettle token exchange failed:", errText);
                return NextResponse.redirect(`${url.origin}/dashboard/settings?error=Token_Exchange_Failed`);
            }

            const tokenData = await tokenRes.json();
            accessToken = tokenData.access_token;
            refreshToken = tokenData.refresh_token;
            if (tokenData.expires_in) {
                expiryDate = new Date(Date.now() + tokenData.expires_in * 1000);
            }
        }

        await prisma.tenant.update({
            where: { id: tenantId },
            data: {
                zettleAccessToken: accessToken,
                zettleRefreshToken: refreshToken,
                zettleTokenExpiry: expiryDate
            }
        });

        // Redirect back to settings
        return NextResponse.redirect(`${url.origin}/dashboard/settings?success=zettle_connected`);
    } catch (error) {
        console.error("GET /api/integrations/zettle/callback error:", error);
        return NextResponse.redirect(`${url.origin}/dashboard/settings?error=Internal_Server_Error`);
    }
}
