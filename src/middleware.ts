import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/utils/supabase/middleware'

export async function middleware(request: NextRequest) {
    try {
        const url = request.nextUrl;
        const hostname = request.headers.get("host") || "";

        // Debugging: Check if env vars are loaded
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        if (!supabaseUrl || !key) {
            console.error("CRITICAL: Missing Supabase Env Vars in Middleware", {
                hasUrl: !!supabaseUrl,
                hasKey: !!key
            });
            // Don't crash, just let it pass
            return NextResponse.next();
        }

        // Subdomain Routing Logic
        // Determine the current host without port (for localhost testing)
        let currentHost = hostname;
        
        if (process.env.NODE_ENV === "production" || process.env.VERCEL === "1") {
            currentHost = hostname.replace(`.cabai.co.uk`, "");
        } else {
            currentHost = hostname.replace(`.localhost:3000`, "");
        }

        // If it's a subdomain (not app, www, the base domain, localhost, and not an API/static route)
        if (
            currentHost !== "app" &&
            currentHost !== "www" &&
            currentHost !== "cabai.co.uk" &&
            currentHost !== "localhost:3000" &&
            currentHost !== hostname && // Ensure it actually was a subdomain
            !url.pathname.startsWith("/api") &&
            !url.pathname.startsWith("/_next") &&
            !url.pathname.startsWith("/dashboard") &&
            !url.pathname.startsWith("/login")
        ) {
            // Rewrite the request to /booker/[subdomain]
            return NextResponse.rewrite(new URL(`/booker/${currentHost}${url.pathname}`, request.url));
        }

        return await updateSession(request)
    } catch (e) {
        console.error("Middleware Failed:", e);
        return NextResponse.next();
    }
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * Feel free to modify this pattern to include more paths.
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
