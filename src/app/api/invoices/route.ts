import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    try {
        const session = await auth();
        // Route restricted to internal dispatchers only
        if (!session?.user?.tenantId || (session.user.role !== 'SUPERADMIN' && session.user.role !== 'DISPATCHER')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const tenantId = session.user.tenantId;
        const body = await req.json();

        const { accountId, jobIds, dueDate, notes, taxRate = 0.20 } = body;

        if (!accountId || !jobIds || !Array.isArray(jobIds) || jobIds.length === 0) {
            return NextResponse.json({ error: 'Invalid payload: Requires accountId and a non-empty array of jobIds' }, { status: 400 });
        }

        // 1. Verify all jobs belong to this tenant, account, and are unbilled & completed
        const jobsToBill = await prisma.job.findMany({
            where: {
                id: { in: jobIds },
                tenantId,
                accountId,
                status: 'COMPLETED',
                isBilled: false
            }
        });

        if (jobsToBill.length !== jobIds.length) {
            return NextResponse.json({ error: 'Some jobs are either not completed, already billed, or do not belong to this account.' }, { status: 400 });
        }

        // 2. Calculate Subtotal
        const subtotal = jobsToBill.reduce((sum, job) => sum + (job.fare || 0), 0);

        // 3. Calculate Tax & Total
        const taxTotal = subtotal * taxRate;
        const total = subtotal + taxTotal;

        // 4. Generate Invoice Reference
        const invoiceCount = await prisma.invoice.count({ where: { tenantId } });
        const invoiceNumber = `INV-${new Date().getFullYear()}-${1000 + invoiceCount}`;

        // 5. Transaction: Create Invoice and link Jobs
        const invoiceDate = new Date();
        const invoiceDueDate = dueDate ? new Date(dueDate) : new Date(invoiceDate.getTime() + (30 * 24 * 60 * 60 * 1000)); // Default Net 30

        const invoice = await prisma.$transaction(async (tx) => {
            const newInvoice = await tx.invoice.create({
                data: {
                    tenantId,
                    accountId,
                    invoiceNumber,
                    issueDate: invoiceDate,
                    dueDate: invoiceDueDate,
                    status: 'ISSUED',
                    subtotal,
                    taxTotal,
                    total,
                    notes: notes || ""
                }
            });

            // Mark Jobs as Billed
            await tx.job.updateMany({
                where: { id: { in: jobIds } },
                data: {
                    isBilled: true,
                    invoiceId: newInvoice.id
                }
            });

            return newInvoice;
        });

        return NextResponse.json(invoice, { status: 201 });

    } catch (error) {
        console.error('Failed to create invoice:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function GET() {
    try {
        const session = await auth();
        if (!session?.user?.tenantId || (session.user.role !== 'SUPERADMIN' && session.user.role !== 'DISPATCHER')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const tenantId = session.user.tenantId;

        const invoices = await prisma.invoice.findMany({
            where: { tenantId },
            include: {
                account: {
                    select: {
                        id: true,
                        name: true,
                        code: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        return new NextResponse(JSON.stringify(invoices, (_, v) => typeof v === 'bigint' ? v.toString() : v), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Failed to fetch invoices:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
