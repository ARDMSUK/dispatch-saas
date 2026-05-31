import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { calculatePrice } from '@/lib/pricing';
import { getMapboxMatrix } from '@/lib/mapbox';
import { broadcastOperatorAlert } from '@/lib/supabase-broadcast';

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
        const messageType = body.message?.type;

        if (messageType === 'end-of-call-report') {
            const callData = body.message?.call;
            const recordingUrl = callData?.recordingUrl || null;
            const duration = callData?.duration ? Math.round(Number(callData.duration)) : null;
            const transcript = callData?.transcript || null;
            const summary = callData?.summary || null;
            const phone = callData?.customer?.number || body.message?.customer?.number || callData?.phoneNumber || null;

            if (phone) {
                const cleanPhone = phone.replace(/[^0-9+]/g, '');
                const phoneSuffix = cleanPhone.replace(/[^0-9]/g, '').slice(-10);

                const recentJob = await prisma.job.findFirst({
                    where: {
                        tenantId: tenant.id,
                        passengerPhone: { endsWith: phoneSuffix }
                    },
                    orderBy: {
                        bookedAt: 'desc'
                    }
                });

                const incomingCall = await prisma.incomingCall.create({
                    data: {
                        tenantId: tenant.id,
                        phone: cleanPhone,
                        status: 'ANSWERED',
                        answeredByExt: 'Voice AI',
                        recordingUrl,
                        duration,
                        transcript,
                        summary,
                        bookingId: recentJob ? recentJob.id : null
                    }
                });

                console.log(`[VAPI END OF CALL] Logged voice AI call ${incomingCall.id} for phone ${cleanPhone}, linked to job: ${recentJob?.id || 'None'}`);
                return NextResponse.json({ success: true, callId: incomingCall.id, bookingId: recentJob?.id || null });
            }

            return NextResponse.json({ success: true, message: "No customer phone found in report" });
        }

        const toolCalls = body.message?.toolCalls;

        if (!toolCalls || !Array.isArray(toolCalls)) {
            return NextResponse.json({ success: true, message: "Ignored event type or toolCalls missing" });
        }

        const results = [];

        for (const toolCall of toolCalls) {
            const func = toolCall.function;
            const toolCallId = toolCall.id;
            const args = typeof func.arguments === 'string' ? JSON.parse(func.arguments) : func.arguments;

            try {
                // Feature gating for AI Copilot
                if (['check_booking_status', 'modify_booking_request'].includes(func.name)) {
                    if (!tenant.hasAiCopilot || !tenant.enableAiCopilot) {
                        results.push({
                            toolCallId,
                            result: "Error: AI Copilot and Smart Actions are disabled for this tenant subscription."
                        });
                        continue;
                    }
                }

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
                else if (func.name === 'check_booking_status') {
                    const callPhone = body.message?.call?.customer?.number || body.message?.customer?.number || "";
                    const cleanCallPhone = callPhone.replace(/[^0-9+]/g, '');
                    const callSuffix = cleanCallPhone.replace(/[^0-9]/g, '').slice(-10);

                    const inputPhone = args.passengerPhone ? args.passengerPhone.replace(/[^0-9]/g, '').slice(-10) : "";
                    const finalSuffix = inputPhone || callSuffix;

                    if (!finalSuffix) {
                        results.push({
                            toolCallId,
                            result: "Error: No passenger phone number provided or detected."
                        });
                        continue;
                    }

                    const activeJob = await prisma.job.findFirst({
                        where: {
                            tenantId: tenant.id,
                            passengerPhone: { endsWith: finalSuffix },
                            status: { in: ['ACCEPTED', 'DISPATCHED', 'ARRIVED', 'POB'] }
                        },
                        include: {
                            driver: true
                        },
                        orderBy: {
                            bookedAt: 'desc'
                        }
                    });

                    if (!activeJob) {
                        const pendingJob = await prisma.job.findFirst({
                            where: {
                                tenantId: tenant.id,
                                passengerPhone: { endsWith: finalSuffix },
                                status: 'PENDING'
                            },
                            orderBy: {
                                bookedAt: 'desc'
                            }
                        });

                        if (pendingJob) {
                            results.push({
                                toolCallId,
                                result: `Found booking #${pendingJob.id} from ${pendingJob.pickupAddress} to ${pendingJob.dropoffAddress} scheduled for ${new Date(pendingJob.pickupTime).toLocaleString('en-GB')}. It is currently pending driver assignment. No driver is dispatched yet.`
                            });
                        } else {
                            results.push({
                                toolCallId,
                                result: "No active or upcoming bookings found for your phone number."
                            });
                        }
                        continue;
                    }

                    let driverMsg = "No driver has started tracking yet.";
                    let vehicleMsg = "";
                    
                    if (activeJob.driver) {
                        const driver = activeJob.driver;
                        const vehicle = await prisma.vehicle.findFirst({
                            where: { driverId: driver.id }
                        });

                        driverMsg = `Your driver is ${driver.name} (Callsign: ${driver.callsign}).`;
                        if (vehicle) {
                            vehicleMsg = ` They are driving a ${vehicle.color || ""} ${vehicle.make} ${vehicle.model} with registration plate ${vehicle.reg}.`;
                        }

                        if (driver.currentLat && driver.currentLng && activeJob.pickupLat && activeJob.pickupLng) {
                            try {
                                const matrix = await getMapboxMatrix(activeJob.pickupLat, activeJob.pickupLng, [{
                                    id: driver.id,
                                    lat: driver.currentLat,
                                    lng: driver.currentLng
                                }]);
                                
                                if (matrix && matrix[driver.id]) {
                                    const durationMins = Math.ceil(matrix[driver.id].duration / 60);
                                    const distanceMiles = (matrix[driver.id].distance / 1609.34).toFixed(1);
                                    driverMsg += ` They are currently ${distanceMiles} miles away and are estimated to arrive in ${durationMins} minutes.`;
                                }
                            } catch (e) {}
                        }
                    }

                    let statusDescription = "";
                    if (activeJob.status === 'ACCEPTED') {
                        statusDescription = "Your booking has been accepted by a driver.";
                    } else if (activeJob.status === 'DISPATCHED') {
                        statusDescription = "Your driver is currently on their way to you.";
                    } else if (activeJob.status === 'ARRIVED') {
                        statusDescription = "Your driver has arrived at the pickup location.";
                    } else if (activeJob.status === 'POB') {
                        statusDescription = "You are currently onboard the vehicle.";
                    }

                    results.push({
                        toolCallId,
                        result: `${statusDescription} Booking reference is #${activeJob.id}. ${driverMsg}${vehicleMsg}`
                    });
                }
                else if (func.name === 'modify_booking_request') {
                    const bookingId = args.bookingId;
                    const requestType = args.requestType;
                    const details = args.details;

                    const job = await prisma.job.findUnique({
                        where: { id: bookingId }
                    });

                    if (!job) {
                        results.push({
                            toolCallId,
                            result: `Error: Booking ID ${bookingId} not found.`
                        });
                        continue;
                    }

                    const twoHoursFromNow = new Date(Date.now() + 2 * 60 * 60 * 1000);
                    const isSafeToEdit = job.status === 'PENDING' && new Date(job.pickupTime) > twoHoursFromNow;

                    if (isSafeToEdit) {
                        const updateData: any = {};
                        let changeSummary = [];
                        
                        if (args.newPickupTime) {
                            updateData.pickupTime = new Date(args.newPickupTime);
                            changeSummary.push(`pickup time to ${new Date(args.newPickupTime).toLocaleString('en-GB')}`);
                        }
                        if (args.newPickupLocation) {
                            updateData.pickupAddress = args.newPickupLocation;
                            changeSummary.push(`pickup location to ${args.newPickupLocation}`);
                        }
                        if (args.newDropoffLocation) {
                            updateData.dropoffAddress = args.newDropoffLocation;
                            changeSummary.push(`destination to ${args.newDropoffLocation}`);
                        }

                        if (Object.keys(updateData).length > 0) {
                            if (args.newPickupLocation || args.newDropoffLocation) {
                                try {
                                    const priceResult = await calculatePrice({
                                        pickup: args.newPickupLocation || job.pickupAddress,
                                        dropoff: args.newDropoffLocation || job.dropoffAddress,
                                        pickupTime: updateData.pickupTime || new Date(job.pickupTime),
                                        vehicleType: job.vehicleType || "Saloon",
                                        companyId: tenant.id
                                    });
                                    updateData.fare = priceResult.price;
                                    changeSummary.push(`fare recalculated to £${priceResult.price.toFixed(2)}`);
                                } catch (e) {}
                            }

                            await prisma.job.update({
                                where: { id: bookingId },
                                data: updateData
                            });

                            results.push({
                                toolCallId,
                                result: `The booking has been successfully updated with the requested changes: ${changeSummary.join(', ')}.`
                            });
                        } else {
                            await broadcastOperatorAlert({
                                tenantId: tenant.id,
                                alertType: 'modification-request',
                                message: `Passenger requested: "${details}" for Booking #${bookingId}`,
                                bookingId,
                                passengerPhone: job.passengerPhone
                            });

                            results.push({
                                toolCallId,
                                result: "I've sent a priority alert to our dispatch operators to modify the booking details manually. They will coordinate the request."
                            });
                        }
                    } else {
                        await broadcastOperatorAlert({
                            tenantId: tenant.id,
                            alertType: 'modification-request',
                            message: `URGENT change requested for active Booking #${bookingId} (${job.status}): "${details}"`,
                            bookingId,
                            passengerPhone: job.passengerPhone
                        });

                        results.push({
                            toolCallId,
                            result: "Because this booking is scheduled to take place soon or a driver has already been assigned, I cannot modify it automatically. However, I have sent an urgent alert to our dispatch team, and an operator will adjust it immediately."
                        });
                    }
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
