import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await auth();
        
        if (!session?.user?.tenantId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const invoiceId = (await params).id;
        if (!invoiceId) {
            return NextResponse.json({ error: 'Invoice ID required' }, { status: 400 });
        }

        const invoice = await prisma.invoice.findFirst({
            where: {
                id: invoiceId,
                ...(session.user.role !== 'SUPER_ADMIN' && { tenantId: session.user.tenantId }) // Super Admin explicit bypass
            },
            include: {
                tenant: true,
                account: true,
                contract: true,
                jobs: {
                    orderBy: {
                        pickupTime: 'asc'
                    },
                    include: {
                        contractRoute: true
                    }
                }
            }
        });

        if (!invoice) {
            return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
        }

        // Additional B2B Authorization Guard against ID guessing
        if (session.user.role === 'B2B_ADMIN') {
            const b2bAccountId = (session.user as any).accountId;
            if (invoice.accountId !== b2bAccountId) {
                return NextResponse.json({ error: 'Forbidden: Invoice does not belong to your account' }, { status: 403 });
            }
        } else {
            // Must be dispatcher or higher if not B2B_ADMIN
            const allowedRoles = ['SUPER_ADMIN', 'ADMIN', 'TENANT_ADMIN', 'OWNER', 'DISPATCHER'];
            if (!allowedRoles.includes(session.user.role)) {
                return NextResponse.json({ error: 'Forbidden: Insufficient privileges' }, { status: 403 });
            }
        }

        return new NextResponse(JSON.stringify(invoice, (_, v) => typeof v === 'bigint' ? v.toString() : v), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Failed to fetch invoice:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await auth();
        
        const allowedRoles = ['SUPER_ADMIN', 'ADMIN', 'TENANT_ADMIN', 'OWNER', 'DISPATCHER'];
        if (!session?.user?.tenantId || !allowedRoles.includes(session.user.role)) {
            return NextResponse.json({ error: 'Unauthorized or insufficient privileges' }, { status: 403 });
        }

        const invoiceId = (await params).id;
        
        const invoice = await prisma.invoice.findFirst({
            where: {
                id: invoiceId,
                ...(session.user.role !== 'SUPER_ADMIN' && { tenantId: session.user.tenantId })
            }
        });

        if (!invoice) {
            return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
        }

        const body = await req.json();
        const { status } = body;

        if (status !== 'PAID') {
            return NextResponse.json({ error: 'Only updating status to PAID is supported.' }, { status: 400 });
        }

        const updatedInvoice = await prisma.invoice.update({
            where: { id: invoiceId },
            data: { status: 'PAID' }
        });

        return NextResponse.json(updatedInvoice);
    } catch (error) {
        console.error('Failed to update invoice:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
