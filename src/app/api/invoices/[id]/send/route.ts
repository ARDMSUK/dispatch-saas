import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { EmailService } from '@/lib/email-service';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await auth();
        
        const allowedRoles = ['SUPER_ADMIN', 'ADMIN', 'TENANT_ADMIN', 'OWNER'];
        if (!session?.user?.tenantId || !allowedRoles.includes(session.user.role)) {
            return NextResponse.json({ error: 'Forbidden: Insufficient privileges' }, { status: 403 });
        }

        const invoiceId = (await params).id;
        
        const invoice = await prisma.invoice.findFirst({
            where: {
                id: invoiceId,
                ...(session.user.role !== 'SUPER_ADMIN' && { tenantId: session.user.tenantId })
            },
            include: {
                tenant: true,
                account: true
            }
        });

        if (!invoice) {
            return NextResponse.json({ error: 'Invoice not found or does not belong to your tenant' }, { status: 404 });
        }

        if (invoice.status === 'CANCELLED') {
            return NextResponse.json({ error: 'Cannot send a cancelled invoice' }, { status: 400 });
        }

        if (!invoice.account) {
            return NextResponse.json({ error: 'Invoice is not linked to an account' }, { status: 400 });
        }

        const targetEmail = invoice.account.apEmail || invoice.account.email;

        if (!targetEmail) {
            return NextResponse.json({ error: 'No Accounts Payable or primary email configured for this account' }, { status: 400 });
        }

        // Generate token and expiry
        const invoiceShareToken = crypto.randomBytes(32).toString('hex');
        const invoiceShareTokenExpiresAt = new Date();
        invoiceShareTokenExpiresAt.setDate(invoiceShareTokenExpiresAt.getDate() + 90); // 90 days expiry
        const now = new Date();

        // Determine new status
        let newStatus = invoice.status;
        if (invoice.status === 'DRAFT' || invoice.status === 'UNBILLED') { // Handle UNBILLED just in case it exists in the enum
            newStatus = 'ISSUED';
        }

        // Update invoice
        const updatedInvoice = await prisma.invoice.update({
            where: { id: invoice.id },
            data: {
                status: newStatus as any,
                invoiceShareToken,
                invoiceShareTokenExpiresAt,
                invoiceLastSentAt: now,
                invoiceSentTo: targetEmail,
            }
        });

        // Email Service sending
        const orgSettings = {
            name: invoice.tenant.name,
            email: invoice.tenant.email,
        };

        const emailResult = await EmailService.sendInvoiceLink(updatedInvoice, invoice.account, orgSettings);

        if (!emailResult.success) {
            console.error('Email failed to send:', emailResult.error);
            return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
        }

        // Audit Log
        const { logAuditEvent } = await import('@/lib/audit-logger');
        await logAuditEvent({
            tenantId: invoice.tenantId,
            userId: session.user.id,
            action: 'INVOICE_SENT',
            resource: 'INVOICE',
            resourceId: invoice.id,
            details: {
                invoiceId: invoice.id,
                invoiceNumber: invoice.invoiceNumber,
                sentTo: targetEmail,
            },
        });

        return NextResponse.json({ 
            success: true, 
            message: `Invoice sent successfully to ${targetEmail}`,
            method: emailResult.method
        });
    } catch (error) {
        console.error('Failed to send invoice email:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
