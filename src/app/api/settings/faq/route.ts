import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

// GET: Fetch all FAQs for the current tenant
export async function GET(req: Request) {
    try {
        const session = await auth();
        if (!session?.user?.tenantId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const faqs = await prisma.tenantFaq.findMany({
            where: { tenantId: session.user.tenantId },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json(faqs);
    } catch (error) {
        console.error("GET /api/settings/faq error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

// POST: Create a new FAQ entry for the current tenant
export async function POST(req: Request) {
    try {
        const session = await auth();
        if (!session?.user?.tenantId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { question, answer } = body;

        if (!question || !answer) {
            return NextResponse.json({ error: "Question and Answer are required" }, { status: 400 });
        }

        const newFaq = await prisma.tenantFaq.create({
            data: {
                question,
                answer,
                tenantId: session.user.tenantId
            }
        });

        return NextResponse.json(newFaq);
    } catch (error: any) {
        console.error("POST /api/settings/faq error:", error);
        if (error.code === 'P2002') {
            return NextResponse.json({ error: "An FAQ with this exact question already exists." }, { status: 400 });
        }
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

// PATCH: Update an existing FAQ entry
export async function PATCH(req: Request) {
    try {
        const session = await auth();
        if (!session?.user?.tenantId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { id, question, answer } = body;

        if (!id || !question || !answer) {
            return NextResponse.json({ error: "ID, Question, and Answer are required" }, { status: 400 });
        }

        const updatedFaq = await prisma.tenantFaq.update({
            where: {
                id,
                tenantId: session.user.tenantId // Ensure safety/isolation
            },
            data: {
                question,
                answer
            }
        });

        return NextResponse.json(updatedFaq);
    } catch (error) {
        console.error("PATCH /api/settings/faq error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

// DELETE: Delete a specific FAQ entry
export async function DELETE(req: Request) {
    try {
        const session = await auth();
        if (!session?.user?.tenantId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const url = new URL(req.url);
        const id = url.searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: "FAQ ID is required" }, { status: 400 });
        }

        await prisma.tenantFaq.delete({
            where: {
                id,
                tenantId: session.user.tenantId // Ensure safety/isolation
            }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("DELETE /api/settings/faq error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
