
import { auth } from "@/auth";

export default auth((req) => {
    const isLoggedIn = !!req.auth;
    const isOnDashboard = req.nextUrl.pathname.startsWith("/dashboard");
    const isOnLogin = req.nextUrl.pathname.startsWith("/login");

    if (isOnDashboard) {
        if (isLoggedIn) return; // Allow access
        return Response.redirect(new URL("/login", req.nextUrl)); // Redirect to login
    }

    if (isOnLogin) {
        if (isLoggedIn) {
            return Response.redirect(new URL("/dashboard", req.nextUrl)); // Redirect to dashboard if already logged in
        }
        return; // Allow access to login page
    }
});

export const config = {
    // Matcher ignoring internal paths and static files
    matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
