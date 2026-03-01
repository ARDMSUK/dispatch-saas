"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { format } from "date-fns";
import { FileText, Plus, ExternalLink, Calculator } from "lucide-react";
import { Account, Job } from "@/lib/types";

// Extends types locally since the schema was just built
interface Invoice {
    id: string;
    invoiceNumber: string;
    issueDate: string;
    dueDate: string;
    status: string;
    total: number;
    accountId: string;
    account?: Account;
    jobs?: Job[];
}

export default function InvoicesPage() {
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [loading, setLoading] = useState(true);

    // Generator State
    const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);
    const [generatorAccount, setGeneratorAccount] = useState<string>("");
    const [unbilledJobs, setUnbilledJobs] = useState<Job[]>([]);
    const [selectedJobs, setSelectedJobs] = useState<number[]>([]);
    const [generating, setGenerating] = useState(false);

    const fetchData = async () => {
        try {
            const [invRes, accRes] = await Promise.all([
                fetch("/api/invoices"),
                fetch("/api/accounts")
            ]);

            if (invRes.ok) setInvoices(await invRes.json());
            if (accRes.ok) setAccounts(await accRes.json());

        } catch (error) {
            console.error("Failed to load invoice data", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // When an account is selected in the generator, fetch its unbilled jobs
    useEffect(() => {
        const fetchUnbilled = async () => {
            if (!generatorAccount) return;
            try {
                // To save building a brand new route, we can query jobs generically if we had a filter, 
                // but for MVP let's build a quick dedicated 'unbilled' fetcher string
                const res = await fetch(`/api/invoices/unbilled?accountId=${generatorAccount}`);
                if (res.ok) {
                    setUnbilledJobs(await res.json());
                    setSelectedJobs([]); // Reset selection
                }
            } catch (err) {
                console.error(err);
            }
        };
        fetchUnbilled();
    }, [generatorAccount]);

    const handleSelectJob = (id: number) => {
        setSelectedJobs(prev =>
            prev.includes(id) ? prev.filter(jId => jId !== id) : [...prev, id]
        );
    };

    const handleGenerateInvoice = async () => {
        if (!generatorAccount || selectedJobs.length === 0) return;
        setGenerating(true);
        try {
            const res = await fetch("/api/invoices", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    accountId: generatorAccount,
                    jobIds: selectedJobs,
                    taxRate: 0.20 // 20% VAT standard mock
                })
            });

            if (res.ok) {
                setIsGeneratorOpen(false);
                setGeneratorAccount("");
                setUnbilledJobs([]);
                setSelectedJobs([]);
                fetchData();
            } else {
                const err = await res.json();
                alert(`Error: ${err.error || err.message}`);
            }
        } catch (error) {
            console.error(error);
            alert("Failed to generate invoice.");
        } finally {
            setGenerating(false);
        }
    };

    const calcGeneratorSubtotal = unbilledJobs
        .filter(j => selectedJobs.includes(j.id))
        .reduce((sum, j) => sum + (j.fare || 0), 0);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Invoices</h1>
                    <p className="text-zinc-400">Manage corporate billing, generate statements, and track account payments.</p>
                </div>

                <Dialog open={isGeneratorOpen} onOpenChange={setIsGeneratorOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg">
                            <Plus className="w-4 h-4 mr-2" /> Select Jobs & Bill
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[700px] bg-zinc-950 border-zinc-800">
                        <DialogHeader>
                            <DialogTitle>Generate Corporate Invoice</DialogTitle>
                        </DialogHeader>

                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-zinc-300">Select Corporate Account</label>
                                <Select value={generatorAccount} onValueChange={setGeneratorAccount}>
                                    <SelectTrigger className="w-full bg-zinc-900 border-zinc-700">
                                        <SelectValue placeholder="Select Account..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {accounts.filter(a => a.isActive).map(acc => (
                                            <SelectItem key={acc.id} value={acc.id}>{acc.name} ({acc.code})</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {generatorAccount && (
                                <div className="space-y-2 pt-2">
                                    <div className="flex justify-between items-end">
                                        <label className="text-sm font-medium text-zinc-300">Unbilled Completed Jobs ({unbilledJobs.length})</label>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 text-xs text-indigo-400 hover:text-indigo-300"
                                            onClick={() => setSelectedJobs(unbilledJobs.map(j => j.id))}
                                        >
                                            Select All
                                        </Button>
                                    </div>

                                    <div className="border border-zinc-800 rounded-md bg-zinc-900/50 max-h-[300px] overflow-y-auto p-2">
                                        {unbilledJobs.length === 0 ? (
                                            <p className="text-sm text-zinc-500 text-center py-4">No unbilled jobs found for this account.</p>
                                        ) : (
                                            <div className="space-y-1">
                                                {unbilledJobs.map(job => (
                                                    <div
                                                        key={job.id}
                                                        className={`flex items-center justify-between p-2 rounded cursor-pointer transition-colors border ${selectedJobs.includes(job.id) ? 'bg-indigo-900/20 border-indigo-500/50' : 'bg-zinc-950/50 border-transparent hover:bg-zinc-800/50'}`}
                                                        onClick={() => handleSelectJob(job.id)}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-4 h-4 rounded border flex items-center justify-center ${selectedJobs.includes(job.id) ? 'bg-indigo-500 border-indigo-500' : 'border-zinc-600'}`}>
                                                                {selectedJobs.includes(job.id) && <div className="w-2 h-2 bg-white rounded-sm" />}
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <span className="text-sm font-medium text-zinc-200">TRIP-{job.id}</span>
                                                                <span className="text-xs text-zinc-500">{format(new Date(job.pickupTime), 'MMM do')} • {job.passengerName}</span>
                                                            </div>
                                                        </div>
                                                        <span className="text-sm font-mono text-zinc-300">£{job.fare?.toFixed(2)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {selectedJobs.length > 0 && (
                                        <div className="bg-zinc-900 p-3 rounded-md flex justify-between items-center mt-2 border border-zinc-800">
                                            <div className="flex items-center gap-2 text-zinc-400">
                                                <Calculator className="w-4 h-4" />
                                                <span className="text-sm">Subtotal ({selectedJobs.length} trips)</span>
                                            </div>
                                            <span className="text-lg font-bold text-white">£{calcGeneratorSubtotal.toFixed(2)}</span>
                                        </div>
                                    )}

                                    <Button
                                        className="w-full mt-4 bg-indigo-600 hover:bg-indigo-500"
                                        disabled={selectedJobs.length === 0 || generating}
                                        onClick={handleGenerateInvoice}
                                    >
                                        {generating ? "Generating..." : "Generate & Issue Invoice"}
                                    </Button>
                                </div>
                            )}
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            <Card className="bg-zinc-950 border-zinc-800">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="border-zinc-800 bg-zinc-900/50 hover:bg-zinc-900/50">
                                <TableHead className="text-zinc-400">Invoice ID</TableHead>
                                <TableHead className="text-zinc-400">Account</TableHead>
                                <TableHead className="text-zinc-400">Issued</TableHead>
                                <TableHead className="text-zinc-400">Due Date</TableHead>
                                <TableHead className="text-right text-zinc-400">Total</TableHead>
                                <TableHead className="w-[120px] text-center text-zinc-400">Status</TableHead>
                                <TableHead className="w-[80px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-32 text-center text-zinc-500">Loading invoices...</TableCell>
                                </TableRow>
                            ) : invoices.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-48 text-center text-zinc-500">
                                        <FileText className="w-8 h-8 mx-auto mb-2 opacity-20" />
                                        No invoices generated yet.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                invoices.map(inv => (
                                    <TableRow key={inv.id} className="border-zinc-800/50 hover:bg-zinc-900/50">
                                        <TableCell className="font-mono text-zinc-200">{inv.invoiceNumber}</TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-medium text-zinc-200">{inv.account?.name || 'Unknown'}</span>
                                                <span className="text-xs text-zinc-500">{inv.account?.code}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-zinc-400">{format(new Date(inv.issueDate), 'MMM do, yyyy')}</TableCell>
                                        <TableCell className="text-zinc-400">{format(new Date(inv.dueDate), 'MMM do, yyyy')}</TableCell>
                                        <TableCell className="text-right font-bold text-zinc-100">£{inv.total.toFixed(2)}</TableCell>
                                        <TableCell className="text-center">
                                            {inv.status === 'PAID' ? (
                                                <Badge className="bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20">PAID</Badge>
                                            ) : inv.status === 'OVERDUE' ? (
                                                <Badge className="bg-red-500/10 text-red-400 hover:bg-red-500/20">OVERDUE</Badge>
                                            ) : (
                                                <Badge className="bg-amber-500/10 text-amber-500 hover:bg-amber-500/20">{inv.status}</Badge>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-white" title="View PDF">
                                                <ExternalLink className="w-4 h-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </Card>
        </div>
    );
}
