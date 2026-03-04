"use client";

import { useEffect, useRef, useState } from "react";
import { Send, MessageSquare, X, Bot, User } from "lucide-react";

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
}

interface WidgetChatClientProps {
    apiKey: string | undefined;
}

export default function WidgetChatClient({ apiKey }: WidgetChatClientProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [input, setInput] = useState("");
    const [isSending, setIsSending] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        { id: '1', role: 'assistant', content: "Hello! I'm the AI booking assistant. How can I help you today?" }
    ]);

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isSending) return;

        const currentInput = input;
        setInput("");
        setIsSending(true);

        const newMessages = [...messages, { id: Date.now().toString(), role: 'user' as const, content: currentInput }];
        setMessages([...newMessages, { id: 'temp', role: 'assistant', content: '' }]);

        try {
            const res = await fetch(`/api/widget/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey || ''
                },
                body: JSON.stringify({ messages: newMessages })
            });

            if (!res.ok) throw new Error("Failed to send message");

            const reader = res.body?.getReader();
            if (!reader) return;

            const decoder = new TextDecoder();
            let assistantMessage = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });

                // ai SDK toTextStreamResponse often just returns raw text, but might send `0:"..."` format depending on exact version.
                // We'll strip the `0:` prefix if it exists and json parse it, otherwise we treat it as raw text.
                let newText = "";
                const lines = chunk.split('\n');
                for (const line of lines) {
                    if (line.startsWith('0:')) {
                        try {
                            newText += JSON.parse(line.slice(2));
                        } catch (e) {
                            newText += line;
                        }
                    } else if (line.startsWith('3:')) {
                        // Protocol error format, ignore
                    } else {
                        newText += line;
                    }
                }

                if (newText) {
                    assistantMessage += newText;
                    setMessages((prev: Message[]) => [
                        ...prev.slice(0, -1),
                        { id: 'temp', role: 'assistant', content: assistantMessage }
                    ]);
                }
            }
        } catch (error) {
            console.error(error);
            setMessages((prev: Message[]) => [
                ...prev.slice(0, -1),
                { id: 'temp-err', role: 'assistant', content: "Sorry, I encountered an error connecting to the server." }
            ]);
        } finally {
            setIsSending(false);
        }
    };

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
                    className="flex items-center justify-center w-14 h-14 bg-blue-700 text-black rounded-full shadow-xl hover:bg-blue-600 transition-all hover:scale-105 active:scale-95"
                >
                    <MessageSquare className="w-6 h-6" />
                </button>
            </div>
        );
    }

    // When open, render the chat window
    return (
        <div className="fixed bottom-4 right-4 z-50 w-full max-w-[360px] h-[550px] sm:h-[600px] flex flex-col bg-slate-100 border border-slate-200 rounded-2xl shadow-2xl overflow-hidden font-sans">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-slate-200">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-blue-700/20 flex items-center justify-center text-blue-700">
                        <Bot className="w-4 h-4" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-slate-900 text-sm">Booking Assistant</h3>
                        <p className="text-xs text-blue-700">Online &bull; AI Powered</p>
                    </div>
                </div>
                <button
                    onClick={() => setIsOpen(false)}
                    className="p-2 text-slate-500 hover:text-slate-900 rounded-full hover:bg-slate-200 transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>

            {/* Messages Area */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-100">
                {messages.map((m) => (
                    <div
                        key={m.id}
                        className={`flex flex-col max-w-[85%] ${m.role === 'user' ? 'ml-auto items-end' : 'mr-auto items-start'}`}
                    >
                        <div
                            className={`px-4 py-2.5 rounded-2xl text-sm ${m.role === 'user'
                                ? 'bg-blue-700 text-black rounded-tr-sm'
                                : 'bg-slate-200 text-slate-900 rounded-tl-sm'
                                }`}
                        >
                            {m.content}
                        </div>
                        <span className="text-[10px] text-slate-400 mt-1 px-1">{m.role === 'user' ? 'You' : 'Assistant'}</span>
                    </div>
                ))}
            </div>

            {/* Input Area */}
            <div className="p-3 bg-white border-t border-slate-200">
                <form
                    onSubmit={handleFormSubmit}
                    className="flex flex-row gap-2"
                >
                    <input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Type a message..."
                        className="flex-1 bg-slate-100 rounded-full px-4 py-2 text-sm text-slate-900 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-blue-700 border border-slate-200"
                    />
                    <button
                        type="submit"
                        disabled={!input.trim() || isSending}
                        className="w-10 h-10 rounded-full bg-blue-700 text-black flex items-center justify-center shrink-0 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-600 transition-colors"
                    >
                        <Send className="w-4 h-4 ml-0.5" />
                    </button>
                </form>
            </div>
        </div>
    );
}
