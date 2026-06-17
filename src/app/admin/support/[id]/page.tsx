"use client";

import { useState, useRef, useEffect } from "react";
import useSWR from "swr";
import Link from "next/link";
import { format } from "date-fns";
import { ArrowLeft, Send, Shield, User, Bot, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface TicketMessage {
    id: string;
    content: string;
    senderType: string;
    createdAt: string;
    user?: { name: string; email: string };
}

interface Ticket {
    id: string;
    subject: string;
    status: string;
    tenant: { name: string; slug: string };
    messages: TicketMessage[];
}

const fetcher = (url: string) => fetch(url).then(res => {
    if (!res.ok) throw new Error("Failed to load");
    return res.json();
});

export default function AdminTicketChat({ params }: { params: { id: string } }) {
    const { data: ticket, error, mutate } = useSWR<Ticket>(`/api/admin/support/${params.id}`, fetcher, { refreshInterval: 3000 });
    const [input, setInput] = useState("");
    const [isSending, setIsSending] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [ticket?.messages]);

    if (error) return <div className="p-8 text-center text-red-500">Failed to load ticket. <Link href="/admin/support" className="underline ml-2">Go back</Link></div>;
    if (!ticket) return <div className="p-8 text-center animate-pulse">Loading conversation...</div>;

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isSending) return;

        setIsSending(true);
        try {
            const res = await fetch(`/api/admin/support/${ticket.id}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ content: input })
            });

            if (res.ok) {
                setInput("");
                mutate(); // Refresh messages immediately
            }
        } catch (err) {
            console.error(err);
            alert("Failed to send message.");
        } finally {
            setIsSending(false);
        }
    };

    const handleCloseTicket = async () => {
        if (!confirm("Are you sure you want to close this ticket?")) return;
        const res = await fetch(`/api/admin/support/${ticket.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "CLOSED" })
        });
        if (res.ok) mutate();
    };

    return (
        <div className="flex flex-col h-[calc(100vh-8rem)]">
            {/* Header */}
            <div className="flex items-center justify-between bg-white border border-slate-200 rounded-t-xl p-4 shadow-sm z-10">
                <div className="flex items-center gap-4">
                    <Link href="/admin/support" className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                        <ArrowLeft className="w-5 h-5 text-slate-500" />
                    </Link>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="font-bold text-lg text-slate-900">{ticket.subject}</h1>
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs font-medium">
                                {ticket.tenant.name}
                            </span>
                        </div>
                        <p className="text-sm text-slate-500 flex items-center gap-2">
                            Status: <span className="font-medium">{ticket.status}</span>
                        </p>
                    </div>
                </div>
                
                {ticket.status !== 'CLOSED' && (
                    <Button variant="outline" size="sm" onClick={handleCloseTicket} className="text-slate-600">
                        <CheckCircle2 className="w-4 h-4 mr-2" /> Mark as Closed
                    </Button>
                )}
            </div>

            {/* Chat History */}
            <div className="flex-1 overflow-y-auto bg-slate-50 border-x border-slate-200 p-4 space-y-4">
                {ticket.messages.map((msg) => {
                    const isSystemAdmin = msg.senderType === 'SYSTEM_ADMIN';
                    const isAi = msg.senderType === 'AI_AGENT';
                    const isTenant = msg.senderType === 'TENANT_USER';

                    return (
                        <div key={msg.id} className={`flex gap-3 max-w-[80%] ${isSystemAdmin ? 'ml-auto flex-row-reverse' : ''}`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                                isSystemAdmin ? 'bg-blue-600 text-white' : 
                                isAi ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600'
                            }`}>
                                {isSystemAdmin ? <Shield className="w-4 h-4" /> : isAi ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                            </div>
                            
                            <div className={`flex flex-col ${isSystemAdmin ? 'items-end' : 'items-start'}`}>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xs font-medium text-slate-500">
                                        {isSystemAdmin ? "You (Human Support)" : isAi ? "CABAI" : msg.user?.name || "Tenant User"}
                                    </span>
                                    <span className="text-[10px] text-slate-400">
                                        {format(new Date(msg.createdAt), "h:mm a")}
                                    </span>
                                </div>
                                <div className={`px-4 py-2.5 rounded-2xl text-sm whitespace-pre-wrap ${
                                    isSystemAdmin ? 'bg-blue-600 text-white rounded-tr-sm' : 
                                    isAi ? 'bg-white border border-slate-200 text-slate-800 rounded-tl-sm shadow-sm' : 
                                    'bg-slate-200 text-slate-900 rounded-tl-sm'
                                }`}>
                                    {msg.content}
                                </div>
                            </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="bg-white border border-slate-200 rounded-b-xl p-4 shadow-sm">
                {ticket.status === 'CLOSED' ? (
                    <div className="text-center text-slate-500 text-sm py-2">
                        This ticket has been closed.
                    </div>
                ) : (
                    <form onSubmit={handleSend} className="flex items-center gap-3">
                        <Input 
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Type a message to the tenant..."
                            className="flex-1 bg-slate-50 border-slate-200 focus-visible:ring-blue-500"
                            disabled={isSending}
                        />
                        <Button type="submit" disabled={!input.trim() || isSending} className="bg-blue-600 hover:bg-blue-700 text-white shrink-0">
                            <Send className="w-4 h-4" />
                            <span className="sr-only">Send</span>
                        </Button>
                    </form>
                )}
            </div>
        </div>
    );
}
