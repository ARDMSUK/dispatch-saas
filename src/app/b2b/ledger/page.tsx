"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, FileText, Search, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { Job } from "@/lib/types";

// Local Invoice interface
interface Invoice {
    id: string;
    invoiceNumber: string;
    issueDate: string;
    dueDate: string;
    status: string;
    total: number;
}

export default function B2BLedger() {
    // Shared State
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    // Unbilled Trips State
    const [unbilledJobs, setUnbilledJobs] = useState<Job[]>([]);

    // Invoices State
    const [invoices, setInvoices] = useState<Invoice[]>([]);

    const fetchData = async () => {
        try {
            // First fetch jobs (Ledger endpoint currently returns all Historic jobs)
            const [jobsRes, invRes] = await Promise.all([
                fetch("/api/b2b/ledger"),
                fetch("/api/invoices") // Reusing Admin endpoint since it's Tenant-secured Server-side
            ]);

            if (jobsRes.ok) {
                const jobsData: Job[] = await jobsRes.json();
                // Filter specifically for trips NOT yet billed inside the Corporate view
                setUnbilledJobs(jobsData.filter(j => !j.isBilled && j.status === 'COMPLETED'));
            }

            if (invRes.ok) {
                // Ensure they strictly only see their own account's invoices
                // Note: Security requires the backend `/api/invoices` restricts this, or we filter client side for MVP
                // Here we fetch all and let the component render, assuming they are isolated
                const invoicesData: Invoice[] = await invRes.json();
                setInvoices(invoicesData);
            }

        } catch (error) {
            console.error("Failed to fetch B2B Ledger", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const filteredJobs = unbilledJobs.filter(job =>
        job.passengerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.id.toString().includes(searchTerm) ||
        (job.notes && job.notes.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const filteredInvoices = invoices.filter(inv =>
        inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalUnbilled = unbilledJobs
        .filter(j => j.paymentStatus === 'UNPAID')
        .reduce((sum, j) => sum + (j.fare || 0), 0);

    return (
        <div className="space-y-6 flex flex-col h-full">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-zinc-100">Account Ledger</h1>
                    <p className="text-zinc-500 mt-1">Review historic billing, download formal invoices, and track Corporate expenditures.</p>
                </div>
                <div className="flex gap-4">
                    <div className="flex flex-col items-end mr-4">
                        <span className="text-sm font-medium text-zinc-400">Current Unbilled</span>
                        <span className="text-2xl font-bold text-amber-500">£{totalUnbilled.toFixed(2)}</span>
                    </div>
                </div>
            </div>

            <div className="flex gap-2">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-zinc-500" />
                    <Input
                        placeholder="Search records..."
                        className="pl-9 bg-zinc-900/50 border-zinc-800 focus:border-indigo-500/50"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <Tabs defaultValue="invoices" className="flex-1 flex flex-col">
                <TabsList className="bg-zinc-900/50 border border-zinc-800 self-start p-1 h-auto mb-4">
                    <TabsTrigger value="invoices" className="py-2 px-6 data-[state=active]:bg-indigo-600 data-[state=active]:text-white transition-all">
                        Formal Invoices
                    </TabsTrigger>
                    <TabsTrigger value="unbilled" className="py-2 px-6 data-[state=active]:bg-zinc-800 data-[state=active]:text-white transition-all">
                        Unbilled Rides ({unbilledJobs.length})
                    </TabsTrigger>
                </TabsList>

                {/* INVOICES TAB */}
                <TabsContent value="invoices" className="flex-1 mt-0">
                    <Card className="h-full overflow-hidden bg-zinc-900/60 border-zinc-800/80 backdrop-blur-sm shadow-xl">
                        <div className="overflow-auto max-h-full">
                            <Table>
                                <TableHeader className="bg-zinc-950/80 sticky top-0 z-10">
                                    <TableRow className="border-zinc-800 hover:bg-transparent">
                                        <TableHead className="text-zinc-400">Invoice Ref</TableHead>
                                        <TableHead className="text-zinc-400">Issue Date</TableHead>
                                        <TableHead className="text-zinc-400">Due Date</TableHead>
                                        <TableHead className="text-right text-zinc-400">Total</TableHead>
                                        <TableHead className="w-[120px] text-center text-zinc-400">Status</TableHead>
                                        <TableHead className="w-[100px] text-right text-zinc-400">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loading ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="h-48 text-center text-zinc-500">
                                                <div className="flex justify-center items-center space-x-2">
                                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-500"></div>
                                                    <span>Loading statements...</span>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : filteredInvoices.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="h-48 text-center border-none">
                                                <div className="flex flex-col items-center justify-center text-zinc-500">
                                                    <FileText className="h-8 w-8 mb-2 opacity-50" />
                                                    <p>No formal invoices issued yet.</p>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredInvoices.map((inv) => (
                                            <TableRow key={inv.id} className="border-zinc-800/50 hover:bg-zinc-800/30 transition-colors group">
                                                <TableCell className="font-mono text-zinc-300 font-bold">
                                                    {inv.invoiceNumber}
                                                </TableCell>
                                                <TableCell className="text-zinc-400">
                                                    {format(new Date(inv.issueDate), 'MMM do, yyyy')}
                                                </TableCell>
                                                <TableCell className="text-zinc-400">
                                                    {format(new Date(inv.dueDate), 'MMM do, yyyy')}
                                                </TableCell>
                                                <TableCell className="text-right font-mono font-bold text-zinc-100">
                                                    £{(inv.total || 0).toFixed(2)}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    {inv.status === 'PAID' ? (
                                                        <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30">SETTLED</Badge>
                                                    ) : inv.status === 'OVERDUE' ? (
                                                        <Badge className="bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30">OVERDUE</Badge>
                                                    ) : (
                                                        <Badge className="bg-amber-500/20 text-amber-500 border border-amber-500/30 hover:bg-amber-500/30">PENDING</Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 text-indigo-400 hover:text-indigo-300 hover:bg-indigo-900/20"
                                                        onClick={() => window.open(`/shared/invoice/${inv.id}`, '_blank')}
                                                    >
                                                        <ExternalLink className="w-4 h-4 mr-1" /> View PDF
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </Card>
                </TabsContent>

                {/* UNBILLED TRIPS TAB */}
                <TabsContent value="unbilled" className="flex-1 mt-0">
                    <Card className="h-full overflow-hidden bg-zinc-900/60 border-zinc-800/80 backdrop-blur-sm shadow-xl">
                        <div className="overflow-auto max-h-full">
                            <Table>
                                <TableHeader className="bg-zinc-950/80 sticky top-0 z-10">
                                    <TableRow className="border-zinc-800 hover:bg-transparent">
                                        <TableHead className="w-[120px] text-zinc-400">Date</TableHead>
                                        <TableHead className="text-zinc-400">Reference</TableHead>
                                        <TableHead className="text-zinc-400">Passenger</TableHead>
                                        <TableHead className="hidden md:table-cell text-zinc-400">Route</TableHead>
                                        <TableHead className="hidden lg:table-cell text-zinc-400">Notes / CC</TableHead>
                                        <TableHead className="text-right text-zinc-400">Amount</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loading ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="h-48 text-center text-zinc-500">
                                                <div className="flex justify-center items-center space-x-2">
                                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-500"></div>
                                                    <span>Loading rides...</span>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : filteredJobs.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="h-48 text-center border-none">
                                                <div className="flex flex-col items-center justify-center text-zinc-500">
                                                    <FileText className="h-8 w-8 mb-2 opacity-50" />
                                                    <p>All completed rides have been fully invoiced.</p>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredJobs.map((job) => (
                                            <TableRow key={job.id} className="border-zinc-800/50 hover:bg-zinc-800/30 transition-colors group opacity-75">
                                                <TableCell className="font-medium text-zinc-300">
                                                    <div className="flex flex-col">
                                                        <span>{format(new Date(job.pickupTime), 'MMM do, yyyy')}</span>
                                                        <span className="text-xs text-zinc-500">{format(new Date(job.pickupTime), 'HH:mm')}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="font-mono text-zinc-400 text-sm">
                                                    TRIP-{job.id}
                                                </TableCell>
                                                <TableCell>
                                                    <span className="font-medium text-zinc-200">{job.passengerName}</span>
                                                </TableCell>
                                                <TableCell className="hidden md:table-cell">
                                                    <div className="flex flex-col max-w-[250px]">
                                                        <span className="text-xs text-zinc-400 truncate w-full" title={job.pickupAddress}>
                                                            <span className="text-emerald-500 mr-1">●</span>{job.pickupAddress}
                                                        </span>
                                                        <span className="text-xs text-zinc-500 truncate w-full mt-1" title={job.dropoffAddress}>
                                                            <span className="text-red-500 mr-1">●</span>{job.dropoffAddress}
                                                        </span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="hidden lg:table-cell text-sm text-zinc-400">
                                                    {job.notes || '-'}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <span className="font-bold text-zinc-100">
                                                        £{(job.fare || 0).toFixed(2)}
                                                    </span>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
