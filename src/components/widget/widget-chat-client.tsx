"use client";

import { useChat } from '@ai-sdk/react';
import { use, useEffect, useRef, useState } from "react";
import { Send, MessageSquare, X, Bot, User } from "lucide-react";

interface WidgetChatClientProps {
    apiKey: string | undefined;
}

export default function WidgetChatClient({ apiKey }: WidgetChatClientProps) {
    const [isOpen, setIsOpen] = useState(false);

    // Initialize the Vercel AI Chat hook passing the apiKey in headers
    const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
        api: `/api/widget/chat`,
        headers: {
            'x-api-key': apiKey || ''
        },
        initialMessages: [
            { id: '1', role: 'assistant', content: "Hello! I'm the AI booking assistant. How can I help you today?" }
        ]
    });

    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom of messages
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    if (!apiKey) {
        return <div className="p-4 text-sm text-red-500 bg-red-100 rounded">Error: API Key missing in widget URL.</div>;
    }

    // When closed, render a floating bubble
    if (!isOpen) {
        return (
            <div className="fixed bottom-4 right-4 z-50">
                <button
                    onClick={() => setIsOpen(true)}
                    className="flex items-center justify-center w-14 h-14 bg-amber-500 text-black rounded-full shadow-xl hover:bg-amber-400 transition-all hover:scale-105 active:scale-95"
                >
                    <MessageSquare className="w-6 h-6" />
                </button>
            </div>
        );
    }

    // When open, render the chat window
    return (
        <div className="fixed bottom-4 right-4 z-50 w-full max-w-[360px] h-[550px] sm:h-[600px] flex flex-col bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden font-sans">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-zinc-950 border-b border-zinc-800">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-500">
                        <Bot className="w-4 h-4" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-white text-sm">Booking Assistant</h3>
                        <p className="text-xs text-amber-500">Online &bull; AI Powered</p>
                    </div>
                </div>
                <button
                    onClick={() => setIsOpen(false)}
                    className="p-2 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-800 transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>

            {/* Messages Area */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-zinc-900">
                {messages.map((m) => (
                    <div
                        key={m.id}
                        className={`flex flex-col max-w-[85%] ${m.role === 'user' ? 'ml-auto items-end' : 'mr-auto items-start'}`}
                    >
                        <div
                            className={`px-4 py-2.5 rounded-2xl text-sm ${m.role === 'user'
                                ? 'bg-amber-500 text-black rounded-tr-sm'
                                : 'bg-zinc-800 text-zinc-100 rounded-tl-sm'
                                }`}
                        >
                            {m.content}
                        </div>
                        <span className="text-[10px] text-zinc-500 mt-1 px-1">{m.role === 'user' ? 'You' : 'Assistant'}</span>
                    </div>
                ))}
            </div>

            {/* Input Area */}
            <div className="p-3 bg-zinc-950 border-t border-zinc-800">
                <form
                    onSubmit={handleSubmit}
                    className="flex flex-row gap-2"
                >
                    <input
                        value={input}
                        onChange={handleInputChange}
                        placeholder="Type a message..."
                        className="flex-1 bg-zinc-900 rounded-full px-4 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-amber-500 border border-zinc-800"
                    />
                    <button
                        type="submit"
                        disabled={!input.trim() || isLoading}
                        className="w-10 h-10 rounded-full bg-amber-500 text-black flex items-center justify-center shrink-0 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-amber-400 transition-colors"
                    >
                        <Send className="w-4 h-4 ml-0.5" />
                    </button>
                </form>
            </div>
        </div>
    );
}
