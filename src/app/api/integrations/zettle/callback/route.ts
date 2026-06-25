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

        // Ensure we have required configuration
        if (!clientId || !clientSecret) {
            return NextResponse.redirect(`${url.origin}/dashboard/settings?error=Missing_Zettle_Configuration`);
        }

        let accessToken = '';
        let refreshToken = '';
        let expiryDate = new Date();

        const isMockAllowed = process.env.NODE_ENV !== 'production' && process.env.ALLOW_MOCK_ZETTLE_OAUTH === 'true';
        const isMockFlow = code === 'mock_zettle_code' || clientId.startsWith('mock') || clientId.startsWith('dummy');

        if (isMockFlow) {
            if (isMockAllowed) {
                // SECURITY WARNING: Never enable mock OAuth in production
                accessToken = `zettle_at_${Math.random().toString(36).substring(7)}`;
                refreshToken = `zettle_rt_${Math.random().toString(36).substring(7)}`;
                expiryDate = new Date(Date.now() + 3600 * 1000); // 1 hour
            } else {
                return NextResponse.redirect(`${url.origin}/dashboard/settings?error=Mock_Zettle_Not_Allowed_In_Production`);
            }
        } else {
            // Real OAuth flow
            const tokenRes = await fetch('https://oauth.zettle.com/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: new URLSearchParams({
                    grant_type: 'authorization_code',
                    client_id: clientId,
                    client_secret: clientSecret,
                    code: code,
                    redirect_uri: `${url.origin}/api/integrations/zettle/callback`
                })
            });

            if (!tokenRes.ok) {
                console.error("Zettle token exchange failed, status:", tokenRes.status);
                return NextResponse.redirect(`${url.origin}/dashboard/settings?error=Token_Exchange_Failed`);
            }

            const tokenData = await tokenRes.json();
            if (!tokenData.access_token || !tokenData.refresh_token) {
                console.error("Zettle token exchange returned invalid payload");
                return NextResponse.redirect(`${url.origin}/dashboard/settings?error=Invalid_Token_Payload`);
            }

            accessToken = tokenData.access_token;
            refreshToken = tokenData.refresh_token;
            if (tokenData.expires_in) {
                expiryDate = new Date(Date.now() + tokenData.expires_in * 1000);
            } else {
                expiryDate = new Date(Date.now() + 3600 * 1000);
            }
        }

        // Final security check before updating tenant
        if (!accessToken || !refreshToken) {
            return NextResponse.redirect(`${url.origin}/dashboard/settings?error=Token_Retrieval_Failed`);
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
        return NextResponse.redirect(`${new URL(req.url).origin}/dashboard/settings?error=Internal_Server_Error`);
    }
}
