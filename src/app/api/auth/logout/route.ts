import { signOut } from "@/auth";
import { NextResponse } from "next/server";

export async function GET() {
    // Manually expire the session cookie to force logout
    // We try to clear both standard and secure variants to be safe
    const response = NextResponse.redirect(new URL("/login", process.env.NEXTAUTH_URL || "https://dispatch-saas.vercel.app"));

    response.cookies.set("authjs.session-token", "", { maxAge: 0 });
    response.cookies.set("__Secure-authjs.session-token", "", { maxAge: 0 });

    return response;
}
