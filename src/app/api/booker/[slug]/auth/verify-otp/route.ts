import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

export async function POST(
    req: Request,
    { params }: { params: { slug: string } }
) {
    try {
        const { phone, code, hash, expires } = await req.json();

        if (!phone || !code || !hash || !expires) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Verify expiration
        if (Date.now() > parseInt(expires)) {
            return NextResponse.json({ error: 'Verification code has expired' }, { status: 400 });
        }

        // Verify Hash
        const data = `${phone}.${code}.${expires}`;
        const secret = process.env.NEXTAUTH_SECRET || 'cabai-secret-key-fallback';
        const expectedHash = crypto.createHmac('sha256', secret).update(data).digest('hex');

        if (hash !== expectedHash) {
            return NextResponse.json({ error: 'Invalid verification code' }, { status: 400 });
        }

        // If valid, find or create the Customer for this tenant
        const tenant = await prisma.tenant.findUnique({
            where: { slug: params.slug },
            select: { id: true }
        });

        if (!tenant) {
            return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
        }

        let customer = await prisma.customer.findUnique({
            where: {
                tenantId_phone: {
                    tenantId: tenant.id,
                    phone: phone
                }
            }
        });

        // Determine if they need to setup profile
        const needsProfileSetup = !customer || !customer.name || !customer.email;

        if (!customer) {
            // Create a barebones customer record. They will fill out name/email next.
            customer = await prisma.customer.create({
                data: {
                    tenantId: tenant.id,
                    phone: phone,
                }
            });
        }

        return NextResponse.json({ 
            success: true, 
            customer: {
                id: customer.id,
                phone: customer.phone,
                name: customer.name,
                email: customer.email
            },
            needsProfileSetup
        });

    } catch (error) {
        console.error('Verify OTP error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
