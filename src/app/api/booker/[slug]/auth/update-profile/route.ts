import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPassengerToken } from '@/lib/passenger-auth';

export async function POST(
    req: Request,
    { params }: { params: Promise<{ slug: string }> }
) {
    try {
        const { slug } = await params;
        const authPayload = await verifyPassengerToken(req);
        if (!authPayload) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { phone, firstName, lastName, email } = await req.json();

        if (!firstName || !lastName) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const tenant = await prisma.tenant.findUnique({
            where: { slug: slug },
            select: { id: true }
        });

        if (!tenant) {
            return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
        }

        if (tenant.id !== authPayload.tenantId) {
            return NextResponse.json({ error: 'Unauthorized for this tenant' }, { status: 403 });
        }

        let finalName = firstName.trim();
        const lastTrimmed = lastName.trim();
        if (lastTrimmed && !finalName.toLowerCase().includes(lastTrimmed.toLowerCase())) {
            finalName = `${finalName} ${lastTrimmed}`;
        }

        // Phone is allowed to be updated, but not used as authorization
        const dataToUpdate: any = {
            name: finalName,
            email: email || null
        };
        if (phone) {
            dataToUpdate.phone = phone;
        }

        const customer = await prisma.customer.update({
            where: {
                id: authPayload.customerId
            },
            data: dataToUpdate
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
