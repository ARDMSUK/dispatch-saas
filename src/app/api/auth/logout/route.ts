import { signOut } from "@/auth";
import { NextResponse } from "next/server";

export async function GET() {
    await signOut({ redirectTo: "/login", redirect: true });
    // This part is unreachable if signOut redirects, but good for type safety
    return NextResponse.redirect(new URL("/login", process.env.NEXTAUTH_URL || "http://localhost:3000"));
}
