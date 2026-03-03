import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, MessageSquare, Clock, AlertCircle, CheckCircle2 } from "lucide-react";
import Link from "next/link";

export default async function SupportTicketsPage() {
    const session = await auth();
    if (!session || !session.user) redirect('/login');

    const tenantId = session.user.tenantId;

    // Fetch all tickets for this tenant
    const tickets = await prisma.ticket.findMany({
        where: { tenantId },
        orderBy: { updatedAt: 'desc' },
        include: {
            _count: {
                select: { messages: true }
            }
        }
    });

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'PENDING_AI_REVIEW':
                return <Badge variant="outline" className="text-blue-400 border-blue-400/20 bg-blue-400/10"><Clock className="w-3 h-3 mr-1" /> Pending AI</Badge>;
            case 'ANSWERED':
                return <Badge variant="outline" className="text-emerald-400 border-emerald-400/20 bg-emerald-400/10"><CheckCircle2 className="w-3 h-3 mr-1" /> Answered</Badge>;
            case 'ESCALATED':
                return <Badge variant="outline" className="text-amber-400 border-amber-400/20 bg-amber-400/10"><AlertCircle className="w-3 h-3 mr-1" /> Escalated to Human</Badge>;
            case 'CLOSED':
                return <Badge variant="outline" className="text-zinc-500 border-zinc-700 bg-zinc-800">Closed</Badge>;
            default:
                return <Badge variant="outline">Unknown</Badge>;
        }
    };

    return (
        <div className="flex-1 space-y-4 p-8 pt-6 bg-zinc-950 min-h-screen text-white">
            <div className="flex items-center justify-between space-y-2">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Support Desk</h2>
                    <p className="text-zinc-400 mt-1">Get instant answers from our AI Assistant or escalate to human support.</p>
                </div>
                <div className="flex items-center space-x-2">
                    <Button asChild className="bg-amber-500 hover:bg-amber-600 text-black font-semibold">
                        <Link href="/dashboard/support/new">
                            <Plus className="mr-2 h-4 w-4" /> Open New Ticket
                        </Link>
                    </Button>
                </div>
            </div>

            <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader>
                    <CardTitle className="text-xl">Your Tickets</CardTitle>
                    <CardDescription className="text-zinc-400">View and manage your support requests.</CardDescription>
                </CardHeader>
                <CardContent>
                    {tickets.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center text-zinc-500">
                            <MessageSquare className="h-12 w-12 mb-4 text-zinc-700" />
                            <p className="text-lg font-medium text-zinc-300">No active support tickets</p>
                            <p className="text-sm">You haven't opened any support requests yet.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {tickets.map((ticket) => (
                                <Link key={ticket.id} href={`/dashboard/support/${ticket.id}`} className="block">
                                    <div className="flex items-center justify-between p-4 rounded-lg bg-zinc-950/50 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/50 transition-colors">
                                        <div className="flex flex-col space-y-1">
                                            <span className="font-medium text-white">{ticket.subject}</span>
                                            <span className="text-xs text-zinc-500 flex items-center gap-2">
                                                ID: {ticket.id.slice(-8)} &bull; {ticket._count.messages} messages &bull; Last updated {new Date(ticket.updatedAt).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <div>
                                            {getStatusBadge(ticket.status)}
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
