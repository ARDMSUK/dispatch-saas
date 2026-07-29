import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { EmailService } from '@/lib/email-service';

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

        if (!invoice.account) {
            return NextResponse.json({ error: 'Invoice is not linked to an account' }, { status: 400 });
        }

        const targetEmail = invoice.account.apEmail || invoice.account.email;

        if (!targetEmail) {
            return NextResponse.json({ error: 'No Accounts Payable or primary email configured for this account' }, { status: 400 });
        }

        // Email Service sending
        const orgSettings = {
            name: invoice.tenant.name,
            email: invoice.tenant.email,
        };

        const emailResult = await EmailService.sendInvoiceLink(invoice, invoice.account, orgSettings);

        if (!emailResult.success) {
            console.error('Email failed to send:', emailResult.error);
            return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
        }

        // Add an audit log entry if applicable (assuming we have one in the future, currently we just log)
        console.log(`[Audit] User ${session.user.id} (${session.user.role}) sent invoice ${invoice.invoiceNumber} to ${targetEmail}`);

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
