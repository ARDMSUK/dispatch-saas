import { auth } from "@/auth"
import { NextResponse } from "next/server"

export type Role = "SUPER_ADMIN" | "ADMIN" | "TENANT_ADMIN" | "OWNER" | "DISPATCHER" | "DRIVER" | "B2B_ADMIN";

export async function requireAnyRole(allowedRoles: Role[]) {
    const session = await auth()
    if (!session?.user) {
        return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }
    }

    if (!allowedRoles.includes(session.user.role as Role)) {
        return { error: NextResponse.json({ error: "Forbidden: Insufficient privileges" }, { status: 403 }) }
    }

    return { session }
}

export async function requireSuperAdmin() {
    return requireAnyRole(["SUPER_ADMIN"]);
}

export async function requireTenantAdmin() {
    return requireAnyRole(["ADMIN", "OWNER", "TENANT_ADMIN", "SUPER_ADMIN"]);
}

export async function requireDispatcher() {
    return requireAnyRole(["DISPATCHER", "ADMIN", "OWNER", "TENANT_ADMIN", "SUPER_ADMIN"]);
}

export async function requireExactRole(role: Role) {
    return requireAnyRole([role]);
}

export async function requireB2BAccountScope() {
    const session = await auth();
    if (!session?.user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
    if (session.user.role !== "B2B_ADMIN" || !(session.user as any).accountId) {
        return { error: NextResponse.json({ error: "Forbidden: B2B Account Scope Required" }, { status: 403 }) };
    }
    return { session, accountId: (session.user as any).accountId, tenantId: session.user.tenantId };
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
