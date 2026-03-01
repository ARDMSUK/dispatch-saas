import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: { id: string } }) {
    try {
        const session = await auth();
        // Since both Admins and B2B Clients view this page, we verify either exist
        if (!session?.user?.tenantId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const invoiceId = params.id;
        if (!invoiceId) {
            return NextResponse.json({ error: 'Invoice ID required' }, { status: 400 });
        }

        const invoice = await prisma.invoice.findUnique({
            where: {
                id: invoiceId,
                tenantId: session.user.tenantId, // Guard against cross-tenant sniffing
            },
            include: {
                tenant: true,
                account: true,
                jobs: {
                    orderBy: {
                        pickupTime: 'asc'
                    }
                }
            }
        });

        if (!invoice) {
            return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
        }

        // Additional B2B Authorization Guard
        // If they are a B2B user, ensure this invoice actually belongs to their specific account
        if (session.user.role === 'B2B_ADMIN' && invoice.accountId !== session.user.accountId) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        return new NextResponse(JSON.stringify(invoice, (_, v) => typeof v === 'bigint' ? v.toString() : v), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Failed to fetch invoice:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
