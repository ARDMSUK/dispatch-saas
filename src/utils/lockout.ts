import { auth } from "@/auth"
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function requireActiveTenant(operationType: 'READ' | 'WRITE' = 'WRITE') {
    const session = await auth()
    if (!session?.user) {
        return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }
    }

    // SUPER_ADMIN is exempt from lockout restrictions
    if (session.user.role === 'SUPER_ADMIN') {
        return { session }
    }

    const tenantId = session.user.tenantId
    if (!tenantId) {
        return { error: NextResponse.json({ error: "No tenant context" }, { status: 400 }) }
    }

    const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { subscriptionStatus: true }
    })

    if (!tenant) {
        return { error: NextResponse.json({ error: "Tenant not found" }, { status: 404 }) }
    }

    if (tenant.subscriptionStatus !== 'ACTIVE' && tenant.subscriptionStatus !== 'TRIALING') {
        // Read operations might be permitted for PAST_DUE or CANCELED, but writes are blocked if locked out
        if (operationType === 'WRITE') {
            return { error: NextResponse.json({ error: "Tenant is locked. Please update subscription." }, { status: 403 }) }
        }
    }

    return { session }
}
