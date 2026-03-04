"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Send } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

export default function NewTicketPage() {
    const router = useRouter();
    const [subject, setSubject] = useState("");
    const [message, setMessage] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!subject.trim() || !message.trim()) {
            toast.error("Subject and message are required.");
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await fetch("/api/support/tickets", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ subject, initialMessage: message })
            });

            if (res.ok) {
                const data = await res.json();
                router.push(`/dashboard/support/${data.ticketId}`);
            } else {
                toast.error("Failed to create ticket.");
            }
        } catch (error) {
            console.error(error);
            toast.error("An unexpected error occurred.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex-1 space-y-4 p-8 pt-6 bg-white min-h-screen text-slate-900">
            <div className="flex items-center space-x-4 mb-6">
                <Button variant="ghost" size="icon" asChild className="hover:bg-slate-200 text-slate-500">
                    <Link href="/dashboard/support">
                        <ArrowLeft className="h-5 w-5" />
                    </Link>
                </Button>
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Open New Ticket</h2>
                    <p className="text-slate-500 text-sm">Describe your issue to our Support AI for instant assistance.</p>
                </div>
            </div>

            <div className="max-w-2xl">
                <form onSubmit={handleSubmit}>
                    <Card className="bg-slate-100 border-slate-200">
                        <CardHeader>
                            <CardTitle>Ticket Details</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Subject</label>
                                <Input
                                    placeholder="e.g., How do I configure Stripe?"
                                    className="bg-white border-slate-200 text-slate-900 focus:ring-blue-700 focus:border-blue-700"
                                    value={subject}
                                    onChange={(e) => setSubject(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">How can we help?</label>
                                <Textarea
                                    placeholder="Please provide as much detail as possible..."
                                    className="h-32 bg-white border-slate-200 text-slate-900 focus:ring-blue-700 focus:border-blue-700 resize-none"
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    required
                                />
                            </div>
                        </CardContent>
                        <CardFooter className="justify-end border-t border-zinc-800/50 pt-4">
                            <Button
                                type="submit"
                                className="bg-blue-700 hover:bg-blue-800 text-black font-bold"
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? "Opening..." : "Submit Ticket"}
                                {!isSubmitting && <Send className="ml-2 h-4 w-4" />}
                            </Button>
                        </CardFooter>
                    </Card>
                </form>
            </div>
        </div>
    );
}
