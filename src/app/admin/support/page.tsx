"use client";

import { useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { LifeBuoy, AlertCircle, CheckCircle2, MessageSquare, Clock, ArrowRight } from "lucide-react";

interface Ticket {
    id: string;
    subject: string;
    status: string;
    updatedAt: string;
    tenant: { name: string; slug: string };
    _count: { messages: number };
    messages: { content: string; createdAt: string }[];
}

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function AdminSupportInbox() {
    const [statusFilter, setStatusFilter] = useState("ALL");
    const { data: tickets, error } = useSWR<Ticket[]>(`/api/admin/support?status=${statusFilter}`, fetcher, { refreshInterval: 10000 });

    const getStatusIcon = (status: string) => {
        switch (status) {
            case "ESCALATED": return <AlertCircle className="w-4 h-4 text-red-500" />;
            case "PENDING_AI_REVIEW": return <Clock className="w-4 h-4 text-yellow-500" />;
            case "ANSWERED": return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
            case "CLOSED": return <CheckCircle2 className="w-4 h-4 text-slate-400" />;
            default: return <MessageSquare className="w-4 h-4 text-slate-500" />;
        }
    };

    const getStatusText = (status: string) => {
        switch (status) {
            case "ESCALATED": return "Escalated to Human";
            case "PENDING_AI_REVIEW": return "Pending AI Review";
            case "ANSWERED": return "Answered";
            case "CLOSED": return "Closed";
            default: return status;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">Support Hub</h1>
                    <p className="text-slate-500">Monitor and respond to escalated tenant support tickets across the platform.</p>
                </div>
                
                <select 
                    className="h-10 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                >
                    <option value="ALL">All Tickets</option>
                    <option value="ESCALATED">Escalated to Human</option>
                    <option value="PENDING_AI_REVIEW">Pending AI Review</option>
                    <option value="ANSWERED">Answered</option>
                    <option value="CLOSED">Closed</option>
                </select>
            </div>

            {error && <div className="text-red-500">Failed to load tickets.</div>}
            
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                {!tickets ? (
                    <div className="p-8 text-center text-slate-500 animate-pulse">Loading tickets...</div>
                ) : tickets.length === 0 ? (
                    <div className="p-12 text-center flex flex-col items-center">
                        <LifeBuoy className="w-12 h-12 text-slate-300 mb-4" />
                        <h3 className="text-lg font-medium text-slate-900">No tickets found</h3>
                        <p className="text-slate-500 mt-1">There are no tickets matching the current filter.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-200">
                        {tickets.map(ticket => (
                            <Link key={ticket.id} href={`/admin/support/${ticket.id}`} className="block hover:bg-slate-50 transition-colors p-4 sm:p-6 group">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            {getStatusIcon(ticket.status)}
                                            <span className="font-semibold text-slate-900">{ticket.subject}</span>
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600">
                                                {ticket.tenant.name}
                                            </span>
                                        </div>
                                        <p className="text-sm text-slate-500 line-clamp-1 mt-1">
                                            {ticket.messages?.[0]?.content || "No messages yet"}
                                        </p>
                                        <div className="flex items-center gap-4 text-xs text-slate-400 pt-1">
                                            <span>{formatDistanceToNow(new Date(ticket.updatedAt), { addSuffix: true })}</span>
                                            <span>•</span>
                                            <span>{ticket._count.messages} messages</span>
                                            <span>•</span>
                                            <span className={ticket.status === 'ESCALATED' ? 'text-red-500 font-medium' : ''}>
                                                {getStatusText(ticket.status)}
                                            </span>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center text-slate-400 group-hover:text-blue-600 transition-colors">
                                        <ArrowRight className="w-5 h-5" />
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
