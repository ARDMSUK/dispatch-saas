import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const session = await auth();
        if (!session?.user?.tenantId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const contracts = await prisma.contract.findMany({
            where: { tenantId: session.user.tenantId },
            include: { account: true, routes: true },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json(contracts);
    } catch (error) {
        console.error('Failed to fetch contracts:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const session = await auth();
        if (!session?.user?.tenantId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { reference, purchaseOrderNo, name, startDate, endDate, accountId, notes } = body;

        if (!reference || !name || !accountId) {
            return NextResponse.json({ error: 'Reference, Name, and Account ID are required' }, { status: 400 });
        }

        // Verify reference is unique for this tenant
        const existing = await prisma.contract.findUnique({
            where: {
                tenantId_reference: {
                    tenantId: session.user.tenantId,
                    reference
                }
            }
        });

        if (existing) {
            return NextResponse.json({ error: 'Contract reference already exists for this tenant' }, { status: 409 });
        }

        const contract = await prisma.contract.create({
            data: {
                tenantId: session.user.tenantId,
                reference,
                purchaseOrderNo: purchaseOrderNo || null,
                name,
                startDate: startDate ? new Date(startDate) : null,
                endDate: endDate ? new Date(endDate) : null,
                accountId,
                notes: notes || null,
                status: 'ACTIVE'
            }
        });

        return NextResponse.json(contract, { status: 201 });
    } catch (error) {
        console.error('Failed to create contract:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

