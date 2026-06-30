"use client";

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, type UIMessage } from 'ai';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Send, Bot, User, Clock, CheckCircle2, AlertCircle, ArrowLeft } from "lucide-react";
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

interface ChatProps {
    ticketId: string;
    subject: string;
    status: string;
    initialMessages: any[];
}

function getMessageText(message: UIMessage | { content?: string; parts?: any[] }): string {
    if ('content' in message && typeof message.content === 'string') {
        return message.content;
    }
    if ('parts' in message && Array.isArray(message.parts)) {
        return message.parts
            .filter(p => p.type === 'text')
            .map(p => 'text' in p ? p.text : '')
            .join('');
    }
    return '';
}

export default function TicketChatClient({ ticketId, subject, status, initialMessages }: ChatProps) {
    console.log("[DEBUG] TicketChatClient mounted. TicketID:", ticketId, "Status:", status);
    console.log("[DEBUG] initialMessages state length:", initialMessages ? initialMessages.length : 0);
    if (initialMessages && initialMessages.length > 0) {
        console.log("[DEBUG] initialMessages[0] role:", initialMessages[0].role, "content:", initialMessages[0].content);
    }
    // If it's a brand new ticket pending AI review, we withhold the first message from initialMessages
    // so we can use append() to trigger the AI without duplicating the message in the UI.
    const isBrandNewPending = status === 'PENDING_AI_REVIEW' && initialMessages.length === 1 && initialMessages[0].role === 'user';
    console.log("[DEBUG] isBrandNewPending:", isBrandNewPending);
    
    const [localInput, setLocalInput] = useState('');
    const { messages, error, sendMessage, setMessages, regenerate, stop, status: chatStatus } = useChat({
        transport: new DefaultChatTransport({ api: `/api/support/tickets/${ticketId}/chat` }),
        messages: initialMessages.map(msg => ({
            id: String(msg.id),
            role: msg.role === 'agent' ? 'assistant' : 'user',
            parts: [{ type: 'text', text: msg.content || '' }]
        })),
        onFinish: (message) => {
            // router.refresh();
        },
        onError: (error) => {
            console.error("Chat error:", error);
            toast.error("Sorry, the AI assistant could not respond right now. Your message has still been saved and our support team will reply manually.", {
                duration: 6000
            });
        }
    });

    const isLoading = chatStatus === 'submitted' || chatStatus === 'streaming';

    const hasAutoTriggered = useRef(false);

    // Auto-trigger the first AI response if this ticket is brand new and pending.
    useEffect(() => {
        if (isBrandNewPending && !hasAutoTriggered.current) {
            hasAutoTriggered.current = true;
            console.log("[DEBUG] Auto-trigger executing using regenerate. isBrandNewPending:", isBrandNewPending);
            
            if (setMessages && regenerate) {
                console.log("[DEBUG] Setting initial messages and triggering regenerate...");
                setMessages(initialMessages);
                setTimeout(() => {
                    regenerate();
                }, 100);
            } else {
                console.warn("[DEBUG] Could not auto-trigger: setMessages or regenerate is missing.");
            }
        }
    }, [isBrandNewPending, initialMessages, setMessages, regenerate]);

    // Poll the server for new messages (e.g. from Human Support)
    useEffect(() => {
        const fetchMessages = async () => {
            if (document.hidden || isLoading) return; // Don't poll while hidden or AI is typing
            try {
                const res = await fetch(`/api/support/tickets/${ticketId}`);
                if (!res.ok) return;
                const ticket = await res.json();
                
                // Compare message counts to see if a human replied
                if (ticket.messages && ticket.messages.length > messages.length) {
                    const mappedMessages = ticket.messages.map((m: any) => ({
                        id: String(m.id),
                        role: m.senderType === 'TENANT_USER' ? 'user' : 'assistant',
                        parts: [{ type: 'text', text: m.content || '' }],
                        name: m.senderType === 'SYSTEM_ADMIN' ? 'Human_Support' : (m.senderType === 'AI_AGENT' ? 'CABAI' : undefined)
                    }));
                    setMessages(mappedMessages);
                }
            } catch (err) {
                console.error("Failed to poll messages:", err);
            }
        };

        const interval = setInterval(fetchMessages, 5000); // Poll every 5 seconds

        const handleVisibilityChange = () => {
            if (!document.hidden) fetchMessages();
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            clearInterval(interval);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [ticketId, messages.length, isLoading, setMessages]);

    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom of chat
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const getStatusBadge = () => {
        switch (status) {
            case 'PENDING_AI_REVIEW':
                return <Badge variant="outline" className="text-blue-500 border-blue-400/20 bg-blue-400/10"><Clock className="w-3 h-3 mr-1" /> AI Active</Badge>;
            case 'ANSWERED':
                return <Badge variant="outline" className="text-emerald-600 border-emerald-400/20 bg-emerald-400/10"><CheckCircle2 className="w-3 h-3 mr-1" /> Answered</Badge>;
            case 'ESCALATED':
                return <Badge variant="outline" className="text-blue-500 border-blue-500/20 bg-blue-500/10"><AlertCircle className="w-3 h-3 mr-1" /> Escalated to Human</Badge>;
            case 'CLOSED':
                return <Badge variant="outline" className="text-slate-400 border-slate-300 bg-slate-200">Closed</Badge>;
            default:
                return null;
        }
    };

    console.log("[DEBUG] Render finishing normally.");

    return (
        <Card className="flex flex-col bg-slate-100 border-slate-200 flex-1 overflow-hidden max-w-4xl mx-auto w-full">
            <CardHeader className="border-b border-slate-200 bg-white flex flex-row items-center justify-between py-4">
                <div className="flex items-center space-x-3">
                    <Button variant="ghost" size="icon" asChild className="hover:bg-slate-200 text-slate-500 h-8 w-8">
                        <Link href="/dashboard/support">
                            <ArrowLeft className="h-4 w-4" />
                        </Link>
                    </Button>
                    <div>
                        <CardTitle className="text-lg flex items-center space-x-2">
                            <span>{subject}</span>
                            {getStatusBadge()}
                        </CardTitle>
                        <p className="text-xs text-slate-400 font-mono mt-1">Ticket ID: {ticketId.slice(-8)}</p>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="flex-1 p-0 overflow-hidden relative">
                <ScrollArea className="h-full p-4" ref={scrollRef}>
                    <div className="space-y-6 pb-20">
                        {messages.map((m) => (
                            <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`flex max-w-[80%] ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'} items-end gap-2`}>
                                    <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${m.role === 'user' ? 'bg-indigo-600 text-black' : 'bg-blue-500 text-slate-900'}`}>
                                        {m.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                                    </div>
                                    <div className={`px-4 py-3 rounded-2xl text-sm ${m.role === 'user'
                                        ? 'bg-indigo-600 text-black rounded-br-sm'
                                        : 'bg-slate-200 text-slate-900 rounded-bl-sm border border-zinc-700/50 shadow-lg'
                                        }`}>
                                        {getMessageText(m).split('\n').map((line, i) => (
                                            <p key={i} className="mb-1 last:mb-0 whitespace-pre-wrap">{line}</p>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ))}
                        {messages.length === 0 && (
                            <p className="text-slate-500 text-center text-sm">No messages yet.</p>
                        )}
                        
                        
                        {isLoading && (
                            <div className="flex justify-start">
                                <div className="flex items-center gap-2">
                                    <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center shrink-0">
                                        <Bot className="h-4 w-4 text-slate-900" />
                                    </div>
                                    <div className="px-4 py-3 rounded-2xl bg-slate-200 rounded-bl-sm flex items-center space-x-1 border border-zinc-700/50">
                                        <div className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                        <div className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                        <div className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce"></div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </CardContent>

            <CardFooter className="border-t border-slate-200 bg-white/80 p-4">
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        if (!localInput.trim() || isLoading) return;
                        console.log("[DEBUG] form onSubmit triggered. Input:", localInput, "isLoading:", isLoading);
                        if (sendMessage) sendMessage({ role: 'user', parts: [{ type: 'text', text: localInput }] });
                        setLocalInput('');
                    }}
                    className="flex w-full items-center space-x-2"
                >
                    <Input
                        value={localInput || ''}
                        onChange={(e) => setLocalInput(e.target.value)}
                        placeholder={status === 'ESCALATED' ? "Reply to human support..." : "Ask CABAI a question..."}
                        className="flex-1 bg-slate-100 border-slate-300 text-slate-900 focus-visible:ring-indigo-600"
                        disabled={status === 'CLOSED'}
                    />
                    <Button
                        type="submit"
                        size="icon"
                        disabled={!(localInput || '').trim() || isLoading || status === 'CLOSED'}
                        className="bg-indigo-600 hover:bg-purple-600 text-black shrink-0"
                    >
                        <Send className="h-4 w-4" />
                    </Button>
                </form>
            </CardFooter>
        </Card>
    );
}
