import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export async function GET(request: Request) {
    try {
        const session = await auth();
        if (session?.user?.role !== 'SUPER_ADMIN') {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const rules = await prisma.aiKnowledgeRule.findMany({
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json(rules);
    } catch (error) {
        console.error('[KNOWLEDGE_BASE_GET]', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const session = await auth();
        if (session?.user?.role !== 'SUPER_ADMIN') {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const body = await request.json();
        const { topic, content, isActive } = body;

        if (!topic || !content) {
            return new NextResponse('Missing required fields', { status: 400 });
        }

        const rule = await prisma.aiKnowledgeRule.create({
            data: {
                topic,
                content,
                isActive: isActive ?? true
            }
        });

        return NextResponse.json(rule);
    } catch (error) {
        console.error('[KNOWLEDGE_BASE_POST]', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}

export async function PUT(request: Request) {
    try {
        const session = await auth();
        if (session?.user?.role !== 'SUPER_ADMIN') {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const body = await request.json();
        const { id, topic, content, isActive } = body;

        if (!id) {
            return new NextResponse('Missing ID', { status: 400 });
        }

        const rule = await prisma.aiKnowledgeRule.update({
            where: { id },
            data: {
                topic,
                content,
                isActive
            }
        });

        return NextResponse.json(rule);
    } catch (error) {
        console.error('[KNOWLEDGE_BASE_PUT]', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const session = await auth();
        if (session?.user?.role !== 'SUPER_ADMIN') {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return new NextResponse('Missing ID', { status: 400 });
        }

        await prisma.aiKnowledgeRule.delete({
            where: { id }
        });

        return new NextResponse('Deleted', { status: 200 });
    } catch (error) {
        console.error('[KNOWLEDGE_BASE_DELETE]', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}
