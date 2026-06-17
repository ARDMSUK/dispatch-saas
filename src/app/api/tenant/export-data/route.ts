import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { auth } from "@/auth";

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.tenantId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const tenantId = session.user.tenantId;

        // Fetch data
        const [customers, drivers, jobs] = await Promise.all([
            prisma.customer.findMany({ where: { tenantId } }),
            prisma.driver.findMany({ where: { tenantId } }),
            prisma.job.findMany({ where: { tenantId } })
        ]);

        // Create a JSON object representing the export
        const exportData = {
            exportDate: new Date().toISOString(),
            tenantId,
            customers,
            drivers,
            jobs
        };

        // Return as a downloadable JSON file
        const jsonString = JSON.stringify(exportData, null, 2);
        
        return new NextResponse(jsonString, {
            status: 200,
            headers: {
                "Content-Type": "application/json",
                "Content-Disposition": `attachment; filename="cabai-export-${new Date().toISOString().split('T')[0]}.json"`,
            },
        });

    } catch (error) {
        console.error("Export Error:", error);
        return NextResponse.json({ error: "Failed to export data" }, { status: 500 });
    }
}
