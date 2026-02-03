import { NextResponse } from 'next/server';
import { DispatchEngine } from '@/lib/dispatch-engine';
import { prisma } from '@/lib/prisma'; // Need to find tenant?

// In a real scenario, this endpoint should be protected by a CRON_SECRET
// to prevent abuse.
export async function POST(req: Request) {
    try {
        const authHeader = req.headers.get('Authorization');
        // Simple secret check aka "Bearer my-cron-secret"
        // For MVP, allow any call or check specific header

        // We need to run this for all tenants or a specific one?
        // Let's run for all tenants for now.
        const tenants = await prisma.tenant.findMany();

        const results = [];

        for (const tenant of tenants) {
            const report = await DispatchEngine.runDispatchLoop(tenant.id);
            if (report.assigned > 0 || report.failed > 0) {
                results.push({ tenant: tenant.slug, ...report });
            }
        }

        return NextResponse.json({
            success: true,
            results
        });

    } catch (error) {
        console.error("Auto-Dispatch Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
