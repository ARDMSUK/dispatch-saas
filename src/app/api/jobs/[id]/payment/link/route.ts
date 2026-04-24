import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST: Generate a remote payment link for a job
export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const id = parseInt((await params).id);
        if (isNaN(id)) {
            return NextResponse.json({ error: "Invalid job ID" }, { status: 400 });
        }

        const job = await prisma.job.findUnique({
            where: { id },
            include: {
                tenant: true,
                driver: true
            }
        });

        if (!job) {
            return NextResponse.json({ error: "Job not found" }, { status: 404 });
        }

        if (!job.fare) {
            return NextResponse.json({ error: "Job fare must be set to generate a link" }, { status: 400 });
        }

        const routing = job.tenant.paymentRouting; // "CENTRAL" or "DRIVER"
        let accessToken = null;
        let provider = "SUMUP"; // Defaulting to SumUp for this example

        if (routing === "CENTRAL") {
            accessToken = job.tenant.sumupAccessToken;
        } else if (routing === "DRIVER" && job.driver) {
            accessToken = job.driver.sumupAccessToken;
        } else if (routing === "DRIVER" && !job.driver) {
            return NextResponse.json({ error: "No driver assigned to process payment" }, { status: 400 });
        }

        if (!accessToken) {
            return NextResponse.json({ error: "Payment integration not connected for the selected routing method" }, { status: 400 });
        }

        // Mocking the server-side API call to SumUp/Zettle Checkout API
        // In reality, you'd send a POST to api.sumup.com/v0.1/checkouts
        const dummyCheckoutId = `chk_${Math.random().toString(36).substring(7)}`;
        const paymentLink = `https://pay.sumup.io/checkout/${dummyCheckoutId}`;

        // Save the link
        const updatedJob = await prisma.job.update({
            where: { id },
            data: {
                paymentLink,
                paymentProvider: provider
            }
        });

        return NextResponse.json({ success: true, paymentLink });
    } catch (error) {
        console.error("POST /api/jobs/[id]/payment/link error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
