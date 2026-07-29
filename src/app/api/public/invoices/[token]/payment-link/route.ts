import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getStripe } from '@/lib/stripe';
import { decrypt } from '@/lib/encryption';

export async function POST(
    request: Request,
    { params }: { params: Promise<{ token: string }> }
) {
    try {
        const token = (await params).token;
        if (!token) {
            return NextResponse.json({ error: 'Token is required' }, { status: 400 });
        }

        const invoice = await prisma.invoice.findUnique({
            where: { invoiceShareToken: token },
            include: { tenant: true }
        });

        if (!invoice || !invoice.tenant) {
            return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
        }

        if (invoice.invoiceShareTokenExpiresAt && invoice.invoiceShareTokenExpiresAt < new Date()) {
            return NextResponse.json({ error: 'Invoice link has expired' }, { status: 410 });
        }

        if (invoice.status === 'PAID') {
            return NextResponse.json({ error: 'Invoice is already paid' }, { status: 400 });
        }

        if (invoice.status === 'CANCELLED') {
            return NextResponse.json({ error: 'Invoice is cancelled' }, { status: 400 });
        }

        if (invoice.status === 'DRAFT') {
            return NextResponse.json({ error: 'Cannot pay a draft invoice' }, { status: 400 });
        }

        if (invoice.total <= 0 || isNaN(invoice.total)) {
            return NextResponse.json({ error: 'Invalid invoice total' }, { status: 400 });
        }

        const tenant = invoice.tenant;
        let validTenantKey = null;
        if (tenant.stripeSecretKey && decrypt(tenant.stripeSecretKey)) {
            const key = decrypt(tenant.stripeSecretKey) as string;
            if (key.startsWith('sk_live_') || key.startsWith('sk_test_') || key.startsWith('rk_live_') || key.startsWith('rk_test_')) {
                validTenantKey = key;
            }
        }

        const stripeClient = validTenantKey ? getStripe(validTenantKey) : null;

        if (!stripeClient) {
            return NextResponse.json({ error: 'Card payments are not configured for this operator.' }, { status: 400 });
        }

        // Safe base URL builder for Stripe success/cancel redirects
        let baseUrl = 'https://app.cabai.co.uk';
        if (process.env.NEXT_PUBLIC_APP_URL) {
            baseUrl = process.env.NEXT_PUBLIC_APP_URL;
        } else {
            const host = request.headers.get("host") || "";
            const origin = request.headers.get("origin") || "";
            const derivedHost = host || (origin ? new URL(origin).host : "");
            
            if (derivedHost === "app.cabai.co.uk") {
                baseUrl = `https://${derivedHost}`;
            } else if (derivedHost.endsWith(".vercel.app")) {
                baseUrl = `https://${derivedHost}`;
            } else if (process.env.NODE_ENV !== "production" && (derivedHost.startsWith("localhost:") || derivedHost.startsWith("127.0.0.1:"))) {
                baseUrl = `http://${derivedHost}`;
            }
        }
        baseUrl = baseUrl.replace(/\/$/, "");

        const successUrl = `${baseUrl}/invoice/${token}?payment=success`;
        const cancelUrl = `${baseUrl}/invoice/${token}?payment=cancelled`;

        // Check existing Stripe Checkout Session for reuse or expiration
        // @ts-ignore - Assuming B1 schema fields are used dynamically for now
        const existingSessionId = invoice.stripeCheckoutSessionId;
        // @ts-ignore
        const existingLink = invoice.paymentLink;
        // @ts-ignore
        const existingExpiry = invoice.paymentLinkExpiresAt;

        const isExpiredLink = existingExpiry ? new Date() >= existingExpiry : false;

        if (existingSessionId && existingLink && !isExpiredLink) {
            try {
                const session = await stripeClient.checkout.sessions.retrieve(existingSessionId);
                if (session && session.status === 'open') {
                    const expectedAmount = Math.round(invoice.total * 100);
                    if (session.amount_total === expectedAmount) {
                        return NextResponse.json({
                            success: true,
                            url: session.url || existingLink,
                            reused: true
                        });
                    } else {
                        await stripeClient.checkout.sessions.expire(existingSessionId);
                        // @ts-ignore
                        await prisma.invoice.update({
                            where: { id: invoice.id },
                            data: {
                                paymentLink: null,
                                stripeCheckoutSessionId: null,
                                paymentLinkExpiresAt: null,
                            }
                        });
                    }
                }
            } catch (sessionError: any) {
                console.warn(`[Stripe] Failed to retrieve existing Checkout Session for Invoice ${invoice.id}`, sessionError.message);
            }
        }

        // Create Checkout Session
        const stripeSession = await stripeClient.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency: 'gbp',
                        product_data: {
                            name: `Invoice ${invoice.invoiceNumber} - ${tenant.name}`,
                        },
                        unit_amount: Math.round(invoice.total * 100),
                    },
                    quantity: 1,
                },
            ],
            mode: 'payment',
            success_url: successUrl,
            cancel_url: cancelUrl,
            client_reference_id: invoice.id,
            metadata: {
                paymentType: 'invoice_payment',
                invoiceId: invoice.id,
                tenantId: invoice.tenantId,
                accountId: invoice.accountId
            }
        });

        if (!stripeSession.url) {
             return NextResponse.json({ error: 'Failed to generate checkout session' }, { status: 500 });
        }

        // Save the generated link
        // @ts-ignore
        await prisma.invoice.update({
            where: { id: invoice.id },
            data: {
                paymentLink: stripeSession.url,
                paymentLinkExpiresAt: stripeSession.expires_at ? new Date(stripeSession.expires_at * 1000) : null,
                stripeCheckoutSessionId: stripeSession.id,
            }
        });

        return NextResponse.json({ 
            success: true, 
            url: stripeSession.url,
            reused: false
        });

    } catch (error) {
        const rawMessage = error instanceof Error ? error.message : 'Unknown error';
        const redactedMessage = rawMessage.replace(/(sk_live|sk_test|rk_live|rk_test|mk)_[a-zA-Z0-9]+/g, '[REDACTED_KEY]');
        console.error("POST /api/public/invoices/[token]/payment-link error:", redactedMessage);
        
        let safeErrorMessage = 'Unable to create payment link for this invoice.';
        if (rawMessage.includes('API Key') || rawMessage.includes('Invalid API Key')) {
            safeErrorMessage = 'Stripe checkout creation failed. Please check payment configuration.';
        }
        
        return NextResponse.json({ error: safeErrorMessage }, { status: 500 });
    }
}
