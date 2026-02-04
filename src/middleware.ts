import { type NextRequest } from 'next/server'
import { updateSession } from '@/utils/supabase/middleware'

export async function middleware(request: NextRequest) {
    try {
        // Debugging: Check if env vars are loaded
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        if (!url || !key) {
            console.error("CRITICAL: Missing Supabase Env Vars in Middleware", {
                hasUrl: !!url,
                hasKey: !!key
            });
            // Don't crash, just let it pass (auth won't work, but site will load)
            return NextResponse.next();
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
