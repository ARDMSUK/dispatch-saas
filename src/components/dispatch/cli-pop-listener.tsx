"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PhoneCall, X, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface IncomingCall {
    id: string;
    phone: string;
    status: string;
    createdAt: string;
}

export function CliPopListener() {
    const [activeCall, setActiveCall] = useState<IncomingCall | null>(null);
    const [customerName, setCustomerName] = useState<string | null>(null);
    const router = useRouter();

    useEffect(() => {
        // Poll for active calls
        const interval = setInterval(async () => {
            try {
                const res = await fetch("/api/dispatch/calls/active");
                if (res.ok) {
                    const calls: IncomingCall[] = await res.json();

                    if (calls.length > 0) {
                        const call = calls[0]; // Take the oldest ringing call
                        // Try to find if we already have it in state so we don't re-fetch customer unnecessarily
                        if (activeCall?.id !== call.id) {
                            setActiveCall(call);

                            // Attempt to look up the customer name from our database
                            // Note: In a full implementation, you'd want a dedicated endpoint like `/api/customers/lookup?phone=${call.phone}`
                            // To keep it simple for now, we'll try to fetch it if we had such an endpoint, or just display the number.
                            try {
                                // As a fast lookup trick, we check if they exist by grabbing all customers and finding a match.
                                // (Optimize this in production)
                                const custRes = await fetch("/api/customers");
                                if (custRes.ok) {
                                    const customers = await custRes.json();
                                    const match = customers.find((c: any) => c.phone === call.phone);
                                    if (match && match.name) {
                                        setCustomerName(match.name);
                                    } else {
                                        setCustomerName(null);
                                    }
                                }
                            } catch (e) {
                                // ignore
                            }
                        }
                    } else {
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

        // Optimistically hide
        const callId = activeCall.id;
        setActiveCall(null);

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

        setActiveCall(null);

        try {
            await fetch(`/api/dispatch/calls/${callId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'ANSWERED' })
            });

            // Navigate to the dispatch screen with pre-filled query params
            router.push(`/dashboard/dispatch?phone=${encodeURIComponent(phone)}&name=${encodeURIComponent(name)}`);
        } catch (e) {
            console.error("Failed to answer call", e);
        }
    };

    if (!activeCall) return null;

    return (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
            <div className="bg-zinc-900 border border-zinc-800 shadow-xl shadow-amber-500/10 rounded-xl overflow-hidden min-w-[320px]">
                {/* Header Tape */}
                <div className="bg-amber-500 h-1.5 w-full animate-pulse" />

                <div className="p-4 flex flex-col gap-3">
                    <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2 text-emerald-400 font-semibold animate-pulse">
                            <PhoneCall className="h-4 w-4" />
                            <span>INCOMING CALL</span>
                        </div>
                        <button onClick={handleDismiss} className="text-zinc-500 hover:text-zinc-300">
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    <div className="flex flex-col gap-1">
                        <span className="text-2xl font-bold font-mono text-white tracking-widest">{activeCall.phone}</span>
                        {customerName ? (
                            <div className="flex items-center gap-1.5 text-zinc-300">
                                <UserIcon className="h-4 w-4 text-amber-500" />
                                <span className="font-medium text-lg">{customerName}</span>
                            </div>
                        ) : (
                            <span className="text-zinc-500 text-sm">New Caller</span>
                        )}
                    </div>

                    <div className="flex gap-2 mt-2">
                        <Button
                            onClick={handleBook}
                            className="flex-1 bg-amber-500 hover:bg-amber-600 text-amber-950 font-bold"
                        >
                            Answer & Book
                        </Button>
                        <Button
                            variant="outline"
                            onClick={handleDismiss}
                            className="border-zinc-700 hover:bg-zinc-800 text-zinc-300"
                        >
                            Dismiss
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
