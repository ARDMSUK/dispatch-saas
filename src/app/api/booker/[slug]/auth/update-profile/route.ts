import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(
    req: Request,
    { params }: { params: Promise<{ slug: string }> }
) {
    try {
        const { slug } = await params;
        const { phone, firstName, lastName, email } = await req.json();

        if (!phone || !firstName || !lastName) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const tenant = await prisma.tenant.findUnique({
            where: { slug: slug },
            select: { id: true }
        });

        if (!tenant) {
            return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
        }

        const customer = await prisma.customer.update({
            where: {
                tenantId_phone: {
                    tenantId: tenant.id,
                    phone: phone
                }
            },
            data: {
                name: `${firstName} ${lastName}`.trim(),
                email: email || null
            }
        });

        return NextResponse.json({ 
            success: true, 
            customer: {
                id: customer.id,
                phone: customer.phone,
                name: customer.name,
                email: customer.email
            }
        });

    } catch (error) {
        console.error('Update profile error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
