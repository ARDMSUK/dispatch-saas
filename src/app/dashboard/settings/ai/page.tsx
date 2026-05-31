"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Bot, MessageSquare, QrCode, Power, Settings2, Activity, Phone, Copy, Trash2, FileText } from "lucide-react";
import Image from "next/image";

export default function TenantAIPage() {
    const [loading, setLoading] = useState(false);
    const [qrCode, setQrCode] = useState<string | null>(null);
    const [status, setStatus] = useState<string>("DISCONNECTED");
    const [instanceId, setInstanceId] = useState<string | null>(null);

    const [hasWebChat, setHasWebChat] = useState(false);
    const [hasVoiceAi, setHasVoiceAi] = useState(false);
    const [enableVoiceAi, setEnableVoiceAi] = useState(false);
    const [tenantId, setTenantId] = useState<string | null>(null);

    const [faqs, setFaqs] = useState<any[]>([]);
    const [newQuestion, setNewQuestion] = useState("");
    const [newAnswer, setNewAnswer] = useState("");
    const [submitting, setSubmitting] = useState(false);

    // Initial Fetch for Tenant AI State
    useEffect(() => {
        fetch('/api/settings/organization') // Re-using organization route or we can create a specific one
            .then(res => res.json())
            .then(data => {
                if (data && data.whatsappInstanceStatus) {
                    setStatus(data.whatsappInstanceStatus);
                    setInstanceId(data.whatsappInstanceId);
                }
                if (data && data.hasWebChatAi !== undefined) {
                    setHasWebChat(data.hasWebChatAi);
                }
                if (data && data.hasVoiceAi !== undefined) {
                    setHasVoiceAi(data.hasVoiceAi);
                }
                if (data && data.enableVoiceAi !== undefined) {
                    setEnableVoiceAi(data.enableVoiceAi);
                }
                if (data && data.id) {
                    setTenantId(data.id);
                }
            })
            .catch(() => console.error("Failed to fetch tenant AI settings"));

        fetchFaqs();
    }, []);

    const fetchFaqs = () => {
        fetch('/api/settings/faq')
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) {
                    setFaqs(data);
                }
            })
            .catch(() => console.error("Failed to fetch FAQs"));
    };

    const handleAddFaq = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newQuestion || !newAnswer) return;
        setSubmitting(true);
        try {
            const res = await fetch('/api/settings/faq', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ question: newQuestion, answer: newAnswer })
            });
            if (res.ok) {
                toast.success("FAQ added successfully");
                setNewQuestion("");
                setNewAnswer("");
                fetchFaqs();
            } else {
                const data = await res.json();
                toast.error(data.error || "Failed to add FAQ");
            }
        } catch {
            toast.error("Network error");
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteFaq = async (id: string) => {
        if (!confirm("Are you sure you want to delete this FAQ entry?")) return;
        try {
            const res = await fetch(`/api/settings/faq?id=${id}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                toast.success("FAQ deleted successfully");
                fetchFaqs();
            } else {
                toast.error("Failed to delete FAQ");
            }
        } catch {
            toast.error("Network error");
        }
    };

    const toggleVoiceAi = async () => {
        const newValue = !enableVoiceAi;
        setLoading(true);
        try {
            const res = await fetch('/api/settings/organization', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ enableVoiceAi: newValue })
            });
            if (res.ok) {
                setEnableVoiceAi(newValue);
                toast.success(`Voice AI agent has been ${newValue ? 'enabled' : 'disabled'}.`);
            } else {
                toast.error("Failed to update Voice AI settings.");
            }
        } catch (error) {
            toast.error("Network error saving settings.");
        } finally {
            setLoading(false);
        }
    };

    const requestWhatsAppQR = async () => {
        setLoading(true);
        setQrCode(null);
        try {
            const res = await fetch('/api/whatsapp/connect', { method: 'POST' });
            if (res.ok) {
                const data = await res.json();
                if (data.qrcode) {
                    setQrCode(data.qrcode);
                    setStatus("CONNECTING");
                    toast.success("QR Code generated! Please scan rapidly.");
                } else {
                    toast.error("Failed to parse QR Code from Response");
                }
            } else {
                const errorData = await res.json().catch(() => ({}));
                toast.error(`Gateway Error: ${JSON.stringify(errorData)}`);
            }
        } catch (error) {
            toast.error("Network error connecting to Gateway");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 max-w-5xl mx-auto pb-12">
            <div>
                <h2 className="text-2xl font-bold tracking-tight">AI Agents & Integrations</h2>
                <p className="text-slate-500">Manage your autonomous agents and configure integrations to live messaging platforms.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* WHATSAPP AGENT CARD */}
                <Card className="border-emerald-200 bg-emerald-50/10">
                    <CardHeader className="pb-4 border-b border-emerald-100">
                        <div className="flex justify-between items-start">
                            <CardTitle className="flex items-center gap-2 text-emerald-800">
                                <MessageSquare className="w-5 h-5" />
                                WhatsApp AI Agent
                            </CardTitle>
                            {status === "CONNECTED" ? (
                                <span className="flex items-center gap-1 text-xs font-medium bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full border border-emerald-200">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live
                                </span>
                            ) : (
                                <span className="flex items-center gap-1 text-xs font-medium bg-slate-100 text-slate-600 px-2 py-1 rounded-full border border-slate-200">
                                    <Power className="w-3 h-3 text-slate-400" /> Disconnected
                                </span>
                            )}
                        </div>
                        <CardDescription className="text-emerald-700/70 pt-2">
                            Connect your business WhatsApp number by scanning a QR code. The Cabot AI Agent will instantly take over and autonomously handle inbound reservations.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-6">
                        
                        {/* Status UI Contexts */}
                        {(!status || status === "DISCONNECTED" || (status === "CONNECTING" && !qrCode)) && (
                            <div className="bg-white border rounded-xl p-6 text-center space-y-4 shadow-sm">
                                <div className="mx-auto w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mb-2">
                                    <QrCode className="w-6 h-6 text-emerald-600" />
                                </div>
                                <div>
                                    <h4 className="font-semibold text-slate-900">Link Your Device</h4>
                                    <p className="text-sm text-slate-500 max-w-xs mx-auto mt-1">Generate a secure connection code to link your business WhatsApp account.</p>
                                </div>
                                <Button 
                                    onClick={requestWhatsAppQR} 
                                    disabled={loading}
                                    className="bg-emerald-600 hover:bg-emerald-700 w-full font-medium shadow-sm transition-all"
                                >
                                    {loading ? "Waking up Gateway..." : "Generate Connection QR"}
                                </Button>
                            </div>
                        )}

                        {qrCode && status === "CONNECTING" && (
                            <div className="bg-white border-2 border-emerald-400 rounded-xl p-6 text-center space-y-4 shadow-md animate-in slide-in-from-bottom-4 relative">
                                <div className="absolute -top-3 -right-3">
                                    <span className="flex h-6 w-6 relative">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-6 w-6 bg-emerald-500 items-center justify-center text-white">
                                            <Activity className="w-3 h-3" />
                                        </span>
                                    </span>
                                </div>
                                <h4 className="font-semibold text-slate-900">Scan this code using WhatsApp</h4>
                                <p className="text-sm text-slate-500">Open Settings {'>'} Linked Devices. This code expires rapidly.</p>
                                
                                <div className="mx-auto bg-white p-2 border shadow-sm rounded-lg inline-block">
                                    {/* Using standard img tag for base64 from Gateway */}
                                    <img src={qrCode} alt="WhatsApp Connection QR Code" className="w-48 h-48 mx-auto" />
                                </div>
                                
                                <p className="text-xs text-amber-600 font-medium">Waiting for system to confirm scan...</p>
                            </div>
                        )}

                        {status === "CONNECTED" && (
                            <div className="bg-white border border-emerald-200 rounded-xl p-6 space-y-4 shadow-sm relative overflow-hidden">
                                <div className="absolute right-0 top-0 w-32 h-32 bg-emerald-50 rounded-full blur-3xl opacity-50 -mr-16 -mt-16 pointer-events-none" />
                                
                                <div className="flex items-center gap-3">
                                    <div className="bg-emerald-100 p-2 rounded-lg">
                                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-slate-900">System Online</h4>
                                        <p className="text-sm text-slate-500">AI overrides are active on linked device.</p>
                                    </div>
                                </div>

                                <div className="bg-slate-50 rounded-lg p-3 border text-xs font-mono text-slate-600 flex justify-between items-center">
                                    <span>Instance ID:</span>
                                    <span className="font-semibold">{instanceId || 'Unknown'}</span>
                                </div>

                                <Button variant="outline" className="w-full text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors">
                                    Disconnect Device
                                </Button>
                            </div>
                        )}

                    </CardContent>
                </Card>

                {/* WEB CHAT AI CARD (PLACEHOLDER) */}
                <Card className="border-slate-200 overflow-hidden relative">
                    <div className="absolute inset-0 bg-slate-50 z-10 opacity-60 pointer-events-none"></div>
                    <CardHeader className="pb-4 border-b border-slate-100 relative z-20">
                        <div className="flex justify-between items-start">
                            <CardTitle className="flex items-center gap-2 text-indigo-700">
                                <Bot className="w-5 h-5" />
                                Web Chat Widget
                            </CardTitle>
                            {hasWebChat ? (
                                <span className="text-xs font-medium bg-slate-100 text-slate-500 px-2 py-1 rounded-full border">
                                    Configured
                                </span>
                            ) : (
                                <span className="text-xs font-medium bg-amber-100 text-amber-700 px-2 py-1 rounded-full border border-amber-200">
                                    Setup Required
                                </span>
                            )}
                        </div>
                        <CardDescription className="pt-2">
                            The iframe booking assistant directly embedded onto your company's website.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6 relative z-20 opacity-70">
                        <Button variant="outline" className="w-full text-slate-500 border-dashed" disabled>
                            <Settings2 className="w-4 h-4 mr-2" /> Modify Chat Rules
                        </Button>
                    </CardContent>
                </Card>

                {/* VOICE AI AGENT CARD */}
                <Card className={`border-slate-200 overflow-hidden relative ${!hasVoiceAi ? 'opacity-80' : ''}`}>
                    <CardHeader className="pb-4 border-b border-slate-100">
                        <div className="flex justify-between items-start">
                            <CardTitle className="flex items-center gap-2 text-indigo-700">
                                <Phone className="w-5 h-5" />
                                Voice AI Agent
                            </CardTitle>
                            {!hasVoiceAi ? (
                                <span className="text-xs font-medium bg-amber-100 text-amber-700 px-2 py-1 rounded-full border border-amber-200">
                                    Not Subscribed
                                </span>
                            ) : enableVoiceAi ? (
                                <span className="flex items-center gap-1 text-xs font-medium bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full border border-emerald-200">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Listening
                                </span>
                            ) : (
                                <span className="text-xs font-medium bg-slate-100 text-slate-500 px-2 py-1 rounded-full border">
                                    Paused
                                </span>
                            )}
                        </div>
                        <CardDescription className="pt-2">
                            Deploy an autonomous phone-booking voice assistant. It estimates fares, schedules bookings, and answers FAQs.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-4">
                        {!hasVoiceAi ? (
                            <div className="bg-slate-50 border rounded-xl p-4 text-center space-y-2">
                                <p className="text-xs text-slate-500">
                                    This module is locked for your organization. Contact your administrator to add Voice AI support to your subscription.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <Button 
                                    onClick={toggleVoiceAi} 
                                    disabled={loading}
                                    className={`w-full font-semibold transition-all ${enableVoiceAi ? 'bg-amber-600 hover:bg-amber-700 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}`}
                                >
                                    {loading ? "Saving Settings..." : enableVoiceAi ? "Pause Voice Assistant" : "Activate Voice Assistant"}
                                </Button>

                                {enableVoiceAi && tenantId && (
                                    <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 space-y-2">
                                        <label className="text-[10px] uppercase font-bold text-slate-500 block">Vapi Webhook Server URL</label>
                                        <div className="flex gap-2 items-center">
                                            <input 
                                                readOnly 
                                                value={`${typeof window !== 'undefined' ? window.location.origin : ''}/api/voice/bookings?tenantId=${tenantId}`}
                                                className="w-full bg-white border border-slate-200 text-[10px] font-mono p-1 rounded truncate text-slate-600"
                                            />
                                            <Button 
                                                variant="outline" 
                                                className="h-6 w-12 text-[10px] p-0" 
                                                onClick={() => {
                                                    if (typeof window !== 'undefined') {
                                                        navigator.clipboard.writeText(`${window.location.origin}/api/voice/bookings?tenantId=${tenantId}`);
                                                        toast.success("Webhook URL copied to clipboard");
                                                    }
                                                }}
                                            >
                                                Copy
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>

            </div>

            {/* FAQ / KNOWLEDGE BASE SECTION */}
            <Card className="border-slate-200 bg-white">
                <CardHeader>
                    <CardTitle className="text-slate-900 flex items-center gap-2">
                        <FileText className="w-5 h-5 text-indigo-600" />
                        AI Knowledge Base (FAQ System)
                    </CardTitle>
                    <CardDescription>
                        Define custom company policies, pricing rules, or services. The WhatsApp and Voice AI agents query this database dynamically to answer customer questions.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Add FAQ Form */}
                    <form onSubmit={handleAddFaq} className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2 col-span-1 md:col-span-2">
                            <h4 className="font-semibold text-slate-800 text-sm">Add New Q&A Entry</h4>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-slate-500">Question</label>
                            <input 
                                value={newQuestion}
                                onChange={e => setNewQuestion(e.target.value)}
                                placeholder="e.g. Do you provide child seats?"
                                className="w-full bg-white border border-slate-200 text-sm p-2 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                required
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-slate-500">Answer</label>
                            <textarea 
                                value={newAnswer}
                                onChange={e => setNewAnswer(e.target.value)}
                                placeholder="e.g. Yes, we provide baby/booster seats on request..."
                                className="w-full bg-white border border-slate-200 text-sm p-2 rounded-lg text-slate-800 h-[38px] min-h-[38px] max-h-[150px] resize-y focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                required
                            />
                        </div>
                        <div className="col-span-1 md:col-span-2 flex justify-end">
                            <Button type="submit" disabled={submitting} className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium">
                                {submitting ? "Adding..." : "Add Q&A Entry"}
                            </Button>
                        </div>
                    </form>

                    {/* FAQ List */}
                    <div className="space-y-3">
                        <h4 className="font-semibold text-slate-800 text-sm">Active Knowledge Base Entries ({faqs.length})</h4>
                        {faqs.length === 0 ? (
                            <p className="text-sm text-slate-400 italic">No FAQ entries added yet. Add policies above to train your AI agents.</p>
                        ) : (
                            <div className="border rounded-xl overflow-hidden divide-y bg-slate-50/20">
                                {faqs.map(faq => (
                                    <div key={faq.id} className="p-4 bg-white hover:bg-slate-50/50 flex justify-between gap-4 items-start transition-all">
                                        <div className="space-y-1">
                                            <p className="font-semibold text-slate-800 text-sm">Q: {faq.question}</p>
                                            <p className="text-slate-500 text-sm">A: {faq.answer}</p>
                                        </div>
                                        <Button 
                                            type="button"
                                            variant="ghost" 
                                            size="sm" 
                                            onClick={() => handleDeleteFaq(faq.id)}
                                            className="text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors p-2"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

// Inline missing icon
function CheckCircle2(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
    );
}
