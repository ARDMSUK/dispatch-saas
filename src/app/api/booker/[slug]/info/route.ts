import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
    req: Request,
    { params }: { params: { slug: string } }
) {
    try {
        const { slug } = params;

        const tenant = await prisma.tenant.findUnique({
            where: { slug },
            select: {
                name: true,
                logoUrl: true,
                brandColor: true,
                enableWebBooker: true,
            }
        });

        if (!tenant) {
            return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
        }

        if (!tenant.enableWebBooker) {
            return NextResponse.json({ error: 'Web booking disabled' }, { status: 403 });
        }

        return NextResponse.json(tenant);

    } catch (error) {
        console.error('Error fetching public tenant info:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
