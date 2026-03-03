"use client";

import { useChat } from 'ai/react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Send, Bot, User, Clock, CheckCircle2, AlertCircle, ArrowLeft } from "lucide-react";
import Link from 'next/link';
import { useEffect, useRef } from 'react';

interface ChatProps {
    ticketId: string;
    subject: string;
    status: string;
    initialMessages: any[];
}

export default function TicketChatClient({ ticketId, subject, status, initialMessages }: ChatProps) {
    // Vercel AI SDK hook. Automatically calls POST /api/support/tickets/:id/chat
    const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
        api: `/api/support/tickets/${ticketId}/chat`,
        initialMessages,
    });

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
                return <Badge variant="outline" className="text-blue-400 border-blue-400/20 bg-blue-400/10"><Clock className="w-3 h-3 mr-1" /> AI Active</Badge>;
            case 'ANSWERED':
                return <Badge variant="outline" className="text-emerald-400 border-emerald-400/20 bg-emerald-400/10"><CheckCircle2 className="w-3 h-3 mr-1" /> Answered</Badge>;
            case 'ESCALATED':
                return <Badge variant="outline" className="text-amber-400 border-amber-400/20 bg-amber-400/10"><AlertCircle className="w-3 h-3 mr-1" /> Escalated to Human</Badge>;
            case 'CLOSED':
                return <Badge variant="outline" className="text-zinc-500 border-zinc-700 bg-zinc-800">Closed</Badge>;
            default:
                return null;
        }
    };

    return (
        <Card className="flex flex-col bg-zinc-900 border-zinc-800 flex-1 overflow-hidden max-w-4xl mx-auto w-full">
            <CardHeader className="border-b border-zinc-800 bg-zinc-950/50 flex flex-row items-center justify-between py-4">
                <div className="flex items-center space-x-3">
                    <Button variant="ghost" size="icon" asChild className="hover:bg-zinc-800 text-zinc-400 h-8 w-8">
                        <Link href="/dashboard/support">
                            <ArrowLeft className="h-4 w-4" />
                        </Link>
                    </Button>
                    <div>
                        <CardTitle className="text-lg flex items-center space-x-2">
                            <span>{subject}</span>
                            {getStatusBadge()}
                        </CardTitle>
                        <p className="text-xs text-zinc-500 font-mono mt-1">Ticket ID: {ticketId.slice(-8)}</p>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="flex-1 p-0 overflow-hidden relative">
                <ScrollArea className="h-full p-4" ref={scrollRef}>
                    <div className="space-y-6 pb-20">
                        {messages.map((m) => (
                            <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`flex max-w-[80%] ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'} items-end gap-2`}>
                                    <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${m.role === 'user' ? 'bg-amber-500 text-black' : 'bg-blue-600 text-white'}`}>
                                        {m.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                                    </div>
                                    <div className={`px-4 py-3 rounded-2xl text-sm ${m.role === 'user'
                                            ? 'bg-amber-500 text-black rounded-br-sm'
                                            : 'bg-zinc-800 text-zinc-100 rounded-bl-sm border border-zinc-700/50 shadow-lg'
                                        }`}>
                                        {m.content.split('\\n').map((line, i) => (
                                            <p key={i} className="mb-1 last:mb-0 whitespace-pre-wrap">{line}</p>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="flex justify-start">
                                <div className="flex items-center gap-2">
                                    <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
                                        <Bot className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="px-4 py-3 rounded-2xl bg-zinc-800 rounded-bl-sm flex items-center space-x-1 border border-zinc-700/50">
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

            <CardFooter className="border-t border-zinc-800 bg-zinc-950/80 p-4">
                <form
                    onSubmit={handleSubmit}
                    className="flex w-full items-center space-x-2"
                >
                    <Input
                        value={input}
                        onChange={handleInputChange}
                        placeholder={status === 'ESCALATED' ? "Reply to human support..." : "Ask Cabot AI a question..."}
                        className="flex-1 bg-zinc-900 border-zinc-700 text-white focus-visible:ring-amber-500"
                        disabled={status === 'CLOSED'}
                    />
                    <Button
                        type="submit"
                        size="icon"
                        disabled={!input.trim() || isLoading || status === 'CLOSED'}
                        className="bg-amber-500 hover:bg-amber-600 text-black shrink-0"
                    >
                        <Send className="h-4 w-4" />
                    </Button>
                </form>
            </CardFooter>
        </Card>
    );
}
