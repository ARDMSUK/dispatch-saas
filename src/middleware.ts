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
            console.warn("Middleware Warning: Missing Supabase Env Vars", {
                hasUrl: !!supabaseUrl,
                hasKey: !!key
            });
            // Proceed anyway so routing logic is not bypassed
        }

        // Subdomain Routing Logic
        let currentHost = hostname.split(':')[0]; // Remove port if any

        if (currentHost.endsWith('.cabai.co.uk')) {
            currentHost = currentHost.replace('.cabai.co.uk', '');
        } else if (currentHost.endsWith('.localhost')) {
            currentHost = currentHost.replace('.localhost', '');
        }

        // Landing Page Routing
        if (currentHost === "app") {
            // If they access corporate pages on the app subdomain, redirect them to the main site
            if (url.pathname === "/about" || url.pathname === "/features" || url.pathname === "/pricing" || url.pathname === "/contact") {
                return NextResponse.redirect(new URL(`https://cabai.co.uk${url.pathname}`, request.url));
            }
            if (url.pathname === "/") {
                // Redirect to login explicitly instead of rewriting
                return NextResponse.redirect(new URL(`/login`, request.url));
            }
        }

        // If it's a subdomain (not app, www, the base domain, localhost, and not an API/static route)
        if (
            currentHost !== "app" &&
            currentHost !== "www" &&
            currentHost !== "cabai.co.uk" &&
            currentHost !== "localhost" &&
            currentHost !== "localhost:3000" &&
            currentHost !== hostname && // Ensure it actually was a subdomain
            !url.pathname.startsWith("/api") &&
            !url.pathname.startsWith("/_next") &&
            !url.pathname.startsWith("/dashboard") &&
            !url.pathname.startsWith("/login") &&
            !url.pathname.startsWith("/b2b")
        ) {
            // Rewrite the request to /booker/[subdomain]
            let rewritePath = `/booker/${currentHost}${url.pathname}`;
            if (rewritePath.endsWith('/') && rewritePath.length > 1) {
                rewritePath = rewritePath.slice(0, -1);
            }
            const rewriteUrl = new URL(rewritePath, request.url);
            const response = NextResponse.rewrite(rewriteUrl);
            response.headers.set('x-debug-hostname', hostname);
            response.headers.set('x-debug-currenthost', currentHost);
            response.headers.set('x-debug-rewrite-url', rewriteUrl.toString());
            return response;
        }

        const finalResponse = await updateSession(request);
        finalResponse.headers.set('x-debug-hostname-final', hostname);
        finalResponse.headers.set('x-debug-currenthost-final', currentHost);
        return finalResponse;
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
