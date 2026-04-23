"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { PhoneCall, X, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface IncomingCall {
    id: string;
    phone: string;
    status: string;
    answeredByExt?: string | null;
    createdAt: string;
}

export function CliPopListener() {
    const [activeCall, setActiveCall] = useState<IncomingCall | null>(null);
    const [customerName, setCustomerName] = useState<string | null>(null);
    // Use an imperative Ref to prevent stale closures during the polling loop
    const handledCallIds = useRef<Set<string>>(new Set());
    const router = useRouter();

    useEffect(() => {
        // Poll for active calls
        const interval = setInterval(async () => {
            try {
                // FORCE CACHE BYPASS: Explicitly append a random timestamp to crack Edge nodes
                const res = await fetch(`/api/dispatch/calls/active?_t=${Date.now()}`, {
                    cache: 'no-store',
                    headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
                });
                if (res.ok) {
                    const data = await res.json();
                    // Backward compatibility with older array responses just in case
                    const calls: IncomingCall[] = Array.isArray(data) ? data : (data.calls || []);
                    const currentUserExt = data.currentUserExt || null;

                    if (calls.length > 0) {
                        // Find the oldest ringing/answered call that we HAVEN'T handled locally yet
                        const unhandledCall = calls.find(c => !handledCallIds.current.has(c.id));

                        if (unhandledCall) {
                            if (unhandledCall.status === 'ANSWERED') {
                                // If the backend tells us it was answered
                                setActiveCall(null);
                                handledCallIds.current.add(unhandledCall.id);

                                // Multi-Operator Hunt Group check
                                const isMyCall = 
                                    !unhandledCall.answeredByExt || 
                                    !currentUserExt || 
                                    unhandledCall.answeredByExt === currentUserExt;

                                if (isMyCall) {
                                    // Best-effort name lookup for the redirect
                                    let finalName = "";
                                    try {
                                        const custRes = await fetch("/api/customers/lookup?phone=" + encodeURIComponent(unhandledCall.phone));
                                        if (custRes.ok) {
                                            const custData = await custRes.json();
                                            if (custData.found && custData.customer?.name) finalName = custData.customer.name;
                                        }
                                    } catch (e) { }

                                    router.push(`/dashboard?phone=${encodeURIComponent(unhandledCall.phone)}&name=${encodeURIComponent(finalName)}`);
                                }
                            } else {
                                // It's still RINGING, show the popup
                                if (activeCall?.id !== unhandledCall.id) {
                                    setActiveCall(unhandledCall);

                                    // Attempt to look up the customer name from our database
                                    try {
                                        const custRes = await fetch("/api/customers/lookup?phone=" + encodeURIComponent(unhandledCall.phone));
                                        if (custRes.ok) {
                                            const custData = await custRes.json();
                                            if (custData.found && custData.customer?.name) {
                                                setCustomerName(custData.customer.name);
                                            } else {
                                                setCustomerName(null);
                                            }
                                        }
                                    } catch (e) {
                                        // ignore
                                    }
                                }
                            }
                        } else {
                            setActiveCall(null);
                            setCustomerName(null);
                        }
                    } else {
                        // If there are no active calls from the server, clear out the UI
                        setActiveCall(null);
                        setCustomerName(null);
                    }
                }
            } catch (err) {
                console.error("Failed to poll CLI", err);
            }
        }, 3000); // Poll every 3 seconds

        return () => clearInterval(interval);
    }, [activeCall]);

    const handleDismiss = async () => {
        if (!activeCall) return;

        // Optimistically hide and mark as handled locally
        const callId = activeCall.id;
        setActiveCall(null);
        handledCallIds.current.add(callId);

        try {
            await fetch(`/api/dispatch/calls/${callId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'DISMISSED' })
            });
        } catch (e) {
            console.error("Failed to dismiss call", e);
        }
    };

    const handleBook = async () => {
        if (!activeCall) return;

        const callId = activeCall.id;
        const phone = activeCall.phone;
        const name = customerName || "";

        // Mark as handled locally
        setActiveCall(null);
        handledCallIds.current.add(callId);

        try {
            await fetch(`/api/dispatch/calls/${callId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'ANSWERED' })
            });

            // Navigate to the dispatch screen with pre-filled query params
            router.push(`/dashboard?phone=${encodeURIComponent(phone)}&name=${encodeURIComponent(name)}`);
        } catch (e) {
            console.error("Failed to answer call", e);
        }
    };

    if (!activeCall) return null;

    return (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
            <div className="bg-slate-100 border border-slate-200 shadow-xl shadow-blue-700/10 rounded-xl overflow-hidden min-w-[320px]">
                {/* Header Tape */}
                <div className="bg-blue-700 h-1.5 w-full animate-pulse" />

                <div className="p-4 flex flex-col gap-3">
                    <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2 text-emerald-600 font-semibold animate-pulse">
                            <PhoneCall className="h-4 w-4" />
                            <span>INCOMING CALL</span>
                        </div>
                        <button onClick={handleDismiss} className="text-slate-400 hover:text-zinc-300">
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    <div className="flex flex-col gap-1">
                        <span className="text-2xl font-bold font-mono text-slate-900 tracking-widest">{activeCall.phone}</span>
                        {customerName ? (
                            <div className="flex items-center gap-1.5 text-slate-600">
                                <UserIcon className="h-4 w-4 text-blue-700" />
                                <span className="font-medium text-lg">{customerName}</span>
                            </div>
                        ) : (
                            <span className="text-slate-400 text-sm">New Caller</span>
                        )}
                    </div>

                    <div className="flex gap-2 mt-2">
                        <Button
                            onClick={handleBook}
                            className="flex-1 bg-blue-700 hover:bg-blue-800 text-amber-950 font-bold"
                        >
                            Answer & Book
                        </Button>
                        <Button
                            variant="outline"
                            onClick={handleDismiss}
                            className="border-slate-300 hover:bg-slate-200 text-slate-600"
                        >
                            Dismiss
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
