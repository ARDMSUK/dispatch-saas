import { auth } from "@/auth"
import { NextResponse } from "next/server"

export type RequiredRole = "SUPER_ADMIN" | "ADMIN" | "TENANT_ADMIN" | "OWNER" | "DISPATCHER" | "DRIVER" | "B2B_ADMIN";

const roleHierarchy: Record<string, number> = {
    "SUPER_ADMIN": 100,
    "ADMIN": 90,
    "OWNER": 90,
    "TENANT_ADMIN": 90,
    "B2B_ADMIN": 50,
    "DISPATCHER": 40,
    "DRIVER": 10,
};

export async function requireRole(minimumRole: RequiredRole) {
    const session = await auth()
    if (!session?.user) {
        return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }
    }

    const userRole = session.user.role as string
    const minLevel = roleHierarchy[minimumRole] || 0
    const userLevel = roleHierarchy[userRole] || 0

    if (userLevel < minLevel) {
        return { error: NextResponse.json({ error: "Forbidden: Insufficient privileges" }, { status: 403 }) }
    }

    return { session }
}

export async function checkPermission(permission: string) {
    const session = await auth()
    if (!session?.user) {
        return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }
    }

    // SUPER_ADMIN has all permissions implicitly
    if (session.user.role === 'SUPER_ADMIN') {
        return { session }
    }

    const permissions = (session.user as any).permissions as string[] || []
    if (!permissions.includes(permission)) {
        return { error: NextResponse.json({ error: "Forbidden: Missing permission" }, { status: 403 }) }
    }

    return { session }
}
