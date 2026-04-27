import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: { id: string } }) {
    try {
        const session = await auth();
        if (!session?.user?.tenantId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const contract = await prisma.contract.findUnique({
            where: {
                id: params.id,
                tenantId: session.user.tenantId
            },
            include: {
                account: true,
                routes: {
                    include: {
                        stops: {
                            orderBy: { sequenceIndex: 'asc' }
                        },
                        students: true,
                        defaultPa: true
                    }
                }
            }
        });

        if (!contract) {
            return NextResponse.json({ error: 'Contract not found' }, { status: 404 });
        }

        return NextResponse.json(contract);
    } catch (error) {
        console.error('Failed to fetch contract:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
