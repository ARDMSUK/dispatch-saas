import { NextResponse } from 'next/server';
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id || !session?.user?.tenantId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const tenantId = session.user.tenantId;

        // Verify the tenant has access to the Data Import feature
        const tenant = await prisma.tenant.findUnique({
            where: { id: tenantId },
            select: { hasDataImport: true }
        });

        if (!tenant?.hasDataImport) {
            return NextResponse.json({ error: 'Your SaaS plan does not include the Data Migration feature. Please contact support.' }, { status: 403 });
        }

        const body = await req.json();
        const { entityType, data } = body;

        if (!entityType || !data || !Array.isArray(data)) {
            return NextResponse.json({ error: 'Invalid payload format' }, { status: 400 });
        }

        let count = 0;

        if (entityType === 'customers') {
            const createData = data.map(row => ({
                tenantId,
                name: String(row.name || ''),
                phone: String(row.phone || ''),
                email: row.email ? String(row.email) : null,
                notes: row.notes ? String(row.notes) : null,
            })).filter(row => row.name && row.phone); // Basic validation

            if (createData.length > 0) {
                const result = await prisma.customer.createMany({
                    data: createData,
                    skipDuplicates: true // Prevent crashing if phone number already exists
                });
                count = result.count;
            }
        } 
        else if (entityType === 'drivers') {
            const createData = data.map(row => ({
                tenantId,
                name: String(row.name || ''),
                phone: String(row.phone || ''),
                callsign: String(row.callsign || ''),
                email: row.email ? String(row.email) : null,
                status: 'ACTIVE'
            })).filter(row => row.name && row.callsign);

            if (createData.length > 0) {
                const result = await prisma.driver.createMany({
                    data: createData,
                    skipDuplicates: true
                });
                count = result.count;
            }
        } 
        else if (entityType === 'vehicles') {
            const createData = data.map(row => ({
                tenantId,
                reg: String(row.reg || ''),
                make: String(row.make || ''),
                model: String(row.model || ''),
                type: row.type ? String(row.type) : 'Saloon',
            })).filter(row => row.reg && row.make);

            if (createData.length > 0) {
                const result = await prisma.vehicle.createMany({
                    data: createData,
                    skipDuplicates: true
                });
                count = result.count;
            }
        } 
        else {
            return NextResponse.json({ error: 'Unsupported entity type' }, { status: 400 });
        }

        return NextResponse.json({ success: true, count });

    } catch (error: any) {
        console.error("Data Import API Error:", error);
        return NextResponse.json({ error: error.message || 'Failed to process import' }, { status: 500 });
    }
}
