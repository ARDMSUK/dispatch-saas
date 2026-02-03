import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from "@/auth";

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    try {
        const session = await auth();
        if (!session?.user?.tenantId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const tenantId = session.user.tenantId;

        const accounts = await prisma.account.findMany({
            where: {
                tenantId,
                isActive: true
            },
            select: {
                id: true,
                name: true,
                code: true
            },
            orderBy: {
                name: 'asc'
            }
        });

        return NextResponse.json(accounts);
    } catch (error) {
        console.error('Failed to fetch accounts', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
