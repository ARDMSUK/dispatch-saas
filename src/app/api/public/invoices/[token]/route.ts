import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
    try {
        const token = (await params).token;

        if (!token || token === 'invalid-token') {
            return NextResponse.json({ error: 'Not found' }, { status: 404 });
        }

        const invoice = await prisma.invoice.findUnique({
            where: { invoiceShareToken: token },
            include: {
                tenant: {
                    select: {
                        name: true,
                        email: true,
                        phone: true,
                        brandColor: true,
                        logoUrl: true,
                        address: true,
                    }
                },
                account: {
                    select: {
                        name: true,
                        addressLine1: true,
                        addressLine2: true,
                        townCity: true,
                        postcode: true,
                        phone: true,
                        email: true,
                        code: true,
                    }
                },
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
            return NextResponse.json({ error: 'Not found' }, { status: 404 });
        }

        if (invoice.invoiceShareTokenExpiresAt && invoice.invoiceShareTokenExpiresAt < new Date()) {
            return NextResponse.json({ error: 'Link expired' }, { status: 410 });
        }

        const publicInvoiceData = {
            id: invoice.id,
            invoiceNumber: invoice.invoiceNumber,
            status: invoice.status,
            issueDate: invoice.issueDate,
            dueDate: invoice.dueDate,
            subtotal: invoice.subtotal,
            taxTotal: invoice.taxTotal,
            total: invoice.total,
            notes: invoice.notes,
            invoicePeriodStart: invoice.invoicePeriodStart,
            invoicePeriodEnd: invoice.invoicePeriodEnd,
            tenant: invoice.tenant,
            account: invoice.account,
            contract: invoice.contract,
            jobs: invoice.jobs.map((j: any) => ({
                id: j.id,
                pickupTime: j.pickupTime,
                passengerName: j.passengerName,
                pickupAddress: j.pickupAddress,
                dropoffAddress: j.dropoffAddress,
                fare: j.fare,
                contractRoute: j.contractRoute ? {
                    routeNumber: j.contractRoute.routeNumber,
                    name: j.contractRoute.name
                } : null
            }))
        };

        return new NextResponse(JSON.stringify(publicInvoiceData, (_, v) => typeof v === 'bigint' ? v.toString() : v), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('Failed to fetch public invoice:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
