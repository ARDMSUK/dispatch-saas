import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const session = await auth();
        if (session?.user?.role !== 'SUPER_ADMIN') {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const body = await req.json();

        const updatedPlan = await prisma.saasPlan.update({
            where: { id },
            data: {
                name: body.name,
                priceMonthly: body.priceMonthly,
                priceAnnually: body.priceAnnually,
                stripeProductId: body.stripeProductId,
                stripePriceId: body.stripePriceId,

                incZonePricing: body.incZonePricing,
                incDynamicPricing: body.incDynamicPricing,
                incAutoDispatch: body.incAutoDispatch,
                incWaitReturn: body.incWaitReturn,
                incWebBooker: body.incWebBooker,
                incB2bPortal: body.incB2bPortal,
                incWavOptions: body.incWavOptions,
                incLiveTracking: body.incLiveTracking,
                incWebChatAi: body.incWebChatAi,
                incWhatsAppAi: body.incWhatsAppAi,
                incVoiceAi: body.incVoiceAi,
            }
        });

        return NextResponse.json(updatedPlan);
    } catch (error) {
        console.error("[ADMIN_PLANS_PUT_ERROR]", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const session = await auth();
        if (session?.user?.role !== 'SUPER_ADMIN') {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const plan = await prisma.saasPlan.findUnique({
            where: { id },
            include: { tenants: true }
        });

        if (!plan) {
            return NextResponse.json({ error: "Plan not found" }, { status: 404 });
        }

        if (plan.tenants.length > 0) {
            return NextResponse.json({ error: "Cannot delete a plan with active tenants" }, { status: 400 });
        }

        await prisma.saasPlan.delete({
            where: { id }
        });

        return NextResponse.json({ success: true, message: "Plan deleted" });
    } catch (error) {
        console.error("[ADMIN_PLANS_DELETE_ERROR]", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
