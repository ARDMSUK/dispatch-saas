import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { calculatePrice } from '@/lib/pricing';

export async function POST(req: Request) {
    try {
        const url = new URL(req.url);
        const tenantId = url.searchParams.get('tenantId');

        if (!tenantId) {
            return NextResponse.json({ error: "Missing tenantId query parameter" }, { status: 400 });
        }

        // Validate Tenant
        const tenant = await prisma.tenant.findUnique({
            where: { id: tenantId }
        });

        if (!tenant) {
            return NextResponse.json({ error: "Invalid Tenant ID" }, { status: 404 });
        }

        // Validate that Voice AI is unlocked (hasVoiceAi) and toggled on (enableVoiceAi)
        if (!tenant.hasVoiceAi || !tenant.enableVoiceAi) {
            return NextResponse.json({ error: "Voice AI is disabled or not included in subscription for this tenant" }, { status: 403 });
        }

        const body = await req.json();
        const toolCalls = body.message?.toolCalls;

        if (!toolCalls || !Array.isArray(toolCalls)) {
            return NextResponse.json({ error: "Invalid request format: message.toolCalls is missing" }, { status: 400 });
        }

        const results = [];

        for (const toolCall of toolCalls) {
            const func = toolCall.function;
            const toolCallId = toolCall.id;
            const args = typeof func.arguments === 'string' ? JSON.parse(func.arguments) : func.arguments;

            try {
                if (func.name === 'calculate_quote') {
                    const dateObj = new Date(args.pickupTime || new Date());
                    const priceResult = await calculatePrice({
                        pickup: args.pickupLocation,
                        dropoff: args.dropoffLocation,
                        pickupTime: dateObj,
                        vehicleType: args.vehicleType || "Saloon",
                        companyId: tenant.id
                    });

                    let totalQuote = priceResult.price;
                    if (args.isReturn) {
                        totalQuote = priceResult.price * 2;
                    }

                    results.push({
                        toolCallId,
                        result: `The estimated price is £${totalQuote.toFixed(2)}. This is a ${priceResult.breakdown.isFixed ? "Fixed Fare" : "Metered Fare"}.`
                    });
                } 
                else if (func.name === 'create_booking') {
                    const hasReturn = args.isReturn && args.returnTime;
                    const mainFare = args.fare ? (hasReturn ? args.fare / 2 : args.fare) : null;

                    const mainJob = await prisma.job.create({
                        data: {
                            tenantId: tenant.id,
                            passengerName: args.passengerName,
                            passengerPhone: args.passengerPhone,
                            passengerEmail: args.passengerEmail || "",
                            pickupAddress: args.pickupLocation,
                            dropoffAddress: args.dropoffLocation,
                            pickupTime: new Date(args.pickupTime),
                            passengers: args.passengers || 1,
                            luggage: args.luggage || 0,
                            vehicleType: args.vehicleType || "Saloon",
                            isReturn: args.isReturn || false,
                            fare: mainFare,
                            status: "PENDING"
                        }
                    });

                    if (hasReturn) {
                        await prisma.job.create({
                            data: {
                                tenantId: tenant.id,
                                parentJobId: mainJob.id,
                                passengerName: args.passengerName,
                                passengerPhone: args.passengerPhone,
                                passengerEmail: args.passengerEmail || "",
                                pickupAddress: args.dropoffLocation,
                                dropoffAddress: args.pickupLocation,
                                pickupTime: new Date(args.returnTime),
                                passengers: args.passengers || 1,
                                luggage: args.luggage || 0,
                                vehicleType: args.vehicleType || "Saloon",
                                isReturn: true,
                                fare: args.fare ? args.fare / 2 : null,
                                status: "PENDING"
                            }
                        });
                    }

                    results.push({
                        toolCallId,
                        result: `Booking created successfully. The booking reference number is ${mainJob.id}.`
                    });
                }
                else if (func.name === 'lookup_faq') {
                    const rawFaqs = await prisma.tenantFaq.findMany({
                        where: { tenantId: tenant.id }
                    });

                    const queryLower = (args.query || "").toLowerCase();
                    const matches = rawFaqs.filter(faq => {
                        const q = faq.question.toLowerCase();
                        const a = faq.answer.toLowerCase();
                        return q.includes(queryLower) || a.includes(queryLower) || 
                               queryLower.split(' ').some((word: string) => word.length > 3 && (q.includes(word) || a.includes(word)));
                    });

                    let resultString = "";
                    if (matches.length > 0) {
                        resultString = `Here is the official company policy for "${args.query}":\n` + 
                            matches.slice(0, 3).map(m => `Q: ${m.question}\nA: ${m.answer}`).join("\n---\n");
                    } else {
                        resultString = "No matching FAQ entries found. Inform the customer that we will make custom arrangements or that our operations team will call them to clarify.";
                    }

                    results.push({
                        toolCallId,
                        result: resultString
                    });
                }
                else {
                    results.push({
                        toolCallId,
                        result: `Error: Tool ${func.name} is not supported.`
                    });
                }
            } catch (err: any) {
                console.error(`[VOICE AI WEBHOOK] Error executing tool ${func.name}:`, err);
                results.push({
                    toolCallId,
                    result: `Error processing request. Error: ${err.message}`
                });
            }
        }

        return NextResponse.json({ results });
    } catch (error) {
        console.error("[VOICE_AI_WEBHOOK_ERROR]", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
