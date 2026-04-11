import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export async function GET() {
    try {
        const session = await auth();
        if (session?.user?.role !== 'SUPER_ADMIN') {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const plans = await prisma.saasPlan.findMany({
            orderBy: { priceMonthly: 'asc' }
        });

        return NextResponse.json(plans);
    } catch (error) {
        console.error("[ADMIN_PLANS_GET_ERROR]", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const session = await auth();
        if (session?.user?.role !== 'SUPER_ADMIN') {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const body = await req.json();
        
        const newPlan = await prisma.saasPlan.create({
            data: {
                name: body.name || "New Subscription Plan",
                priceMonthly: body.priceMonthly || 0,
                priceAnnually: body.priceAnnually || 0,
                stripeProductId: body.stripeProductId,
                stripePriceId: body.stripePriceId,

                incZonePricing: body.incZonePricing || false,
                incDynamicPricing: body.incDynamicPricing || false,
                incAutoDispatch: body.incAutoDispatch || false,
                incWaitReturn: body.incWaitReturn || false,
                incWebBooker: body.incWebBooker || false,
                incB2bPortal: body.incB2bPortal || false,
                incWavOptions: body.incWavOptions || false,
                incLiveTracking: body.incLiveTracking ?? true,
                incWebChatAi: body.incWebChatAi || false,
                incWhatsAppAi: body.incWhatsAppAi || false,
                incVoiceAi: body.incVoiceAi || false,
            }
        });

        return NextResponse.json(newPlan);
    } catch (error) {
        console.error("[ADMIN_PLANS_POST_ERROR]", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
