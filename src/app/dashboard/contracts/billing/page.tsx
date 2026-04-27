"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { FileText, Calculator, Building2, CheckCircle } from "lucide-react";
import { toast } from "sonner";

export default function ContractBillingPage() {
    const [contracts, setContracts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [selectedContract, setSelectedContract] = useState<string>("");
    
    // Period selection
    const [periods, setPeriods] = useState<{label: string, start: Date, end: Date}[]>([]);
    const [selectedPeriodStr, setSelectedPeriodStr] = useState<string>("");

    const [unbilledJobs, setUnbilledJobs] = useState<any[]>([]);
    const [fetchingJobs, setFetchingJobs] = useState(false);
    const [generating, setGenerating] = useState(false);

    useEffect(() => {
        // Generate last 6 months
        const p = [];
        const now = new Date();
        for (let i = 0; i < 6; i++) {
            const d = subMonths(now, i);
            p.push({
                label: format(d, 'MMMM yyyy'),
                start: startOfMonth(d),
                end: endOfMonth(d)
            });
        }
        setPeriods(p);
        setSelectedPeriodStr(p[0].label);

        const fetchContracts = async () => {
            try {
                // To fetch contracts cleanly, we can hit a generic endpoint, but for now
                // we'll fetch from the standard unbilled contracts endpoint or a new one.
                // Actually, let's fetch from the generic contracts API if it exists, or just use a server action.
                // Since this is a client component, we'll fetch via an API route. Wait, do we have GET /api/contracts?
                // Let's assume we can fetch contracts, or we can use a server component to fetch and pass down.
                const res = await fetch('/api/contracts');
                if (res.ok) {
                    setContracts(await res.json());
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };

        // Instead of fetching from /api/contracts which might not exist, 
        // let's create it or fetch from the parent page and pass as props.
        // I will need to ensure /api/contracts exists.
        fetchContracts();
    }, []);

    useEffect(() => {
        const fetchUnbilled = async () => {
            if (!selectedContract || !selectedPeriodStr) return;
            setFetchingJobs(true);
            const period = periods.find(p => p.label === selectedPeriodStr);
            if (!period) return;

            try {
                const res = await fetch(`/api/invoices/unbilled?contractId=${selectedContract}&startDate=${period.start.toISOString()}&endDate=${period.end.toISOString()}`);
                if (res.ok) {
                    setUnbilledJobs(await res.json());
                }
            } catch (err) {
                console.error(err);
            } finally {
                setFetchingJobs(false);
            }
        };
        fetchUnbilled();
    }, [selectedContract, selectedPeriodStr]);

    const handleGenerateInvoice = async () => {
        if (!selectedContract || unbilledJobs.length === 0) return;
        setGenerating(true);
        const period = periods.find(p => p.label === selectedPeriodStr);

        const contract = contracts.find(c => c.id === selectedContract);

        try {
            const res = await fetch("/api/invoices", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    accountId: contract?.accountId,
                    contractId: selectedContract,
                    jobIds: unbilledJobs.map(j => j.id),
                    taxRate: 0.20, // 20% standard VAT
                    invoicePeriodStart: period?.start.toISOString(),
                    invoicePeriodEnd: period?.end.toISOString()
                })
            });

            if (res.ok) {
                toast.success("Local Authority Invoice Generated");
                setUnbilledJobs([]);
                // Redirect or open invoice
            } else {
                const err = await res.json();
                toast.error(`Error: ${err.error || err.message}`);
            }
        } catch (error) {
            console.error(error);
            toast.error("Failed to generate invoice.");
        } finally {
            setGenerating(false);
        }
    };

    const subtotal = unbilledJobs.reduce((sum, j) => sum + (j.fare || 0), 0);

    return (
        <div className="p-6 max-w-5xl mx-auto space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-2">School Contracts Billing</h1>
                <p className="text-slate-500">Generate monthly Local Authority invoices with compliant PO and route metadata.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="border-slate-200 shadow-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <Building2 className="h-5 w-5 text-indigo-600" />
                            Select Billing Criteria
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700">Contract</label>
                            <Select value={selectedContract} onValueChange={setSelectedContract}>
                                <SelectTrigger className="w-full bg-slate-50 border-slate-200">
                                    <SelectValue placeholder={loading ? "Loading contracts..." : "Select Local Authority Contract..."} />
                                </SelectTrigger>
                                <SelectContent>
                                    {contracts.map(c => (
                                        <SelectItem key={c.id} value={c.id}>{c.name} ({c.reference})</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700">Invoice Period</label>
                            <Select value={selectedPeriodStr} onValueChange={setSelectedPeriodStr}>
                                <SelectTrigger className="w-full bg-slate-50 border-slate-200">
                                    <SelectValue placeholder="Select Month" />
                                </SelectTrigger>
                                <SelectContent>
                                    {periods.map(p => (
                                        <SelectItem key={p.label} value={p.label}>{p.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-slate-200 shadow-sm bg-slate-50">
                    <CardHeader>
                        <CardTitle className="text-lg">Billing Summary</CardTitle>
                        <CardDescription>Aggregate runs for the selected period.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {fetchingJobs ? (
                            <div className="text-sm text-slate-500 py-4">Calculating routes...</div>
                        ) : !selectedContract ? (
                            <div className="text-sm text-slate-500 py-4">Please select a contract to view unbilled runs.</div>
                        ) : (
                            <div className="space-y-4">
                                <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                                    <span className="text-slate-600 text-sm">Unbilled Routes</span>
                                    <span className="font-bold text-slate-900">{unbilledJobs.length}</span>
                                </div>
                                <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                                    <span className="text-slate-600 text-sm">Estimated Subtotal (+20% VAT will be added)</span>
                                    <span className="font-bold text-indigo-700 text-xl">£{subtotal.toFixed(2)}</span>
                                </div>
                                
                                {unbilledJobs.length > 0 ? (
                                    <Button 
                                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-md"
                                        onClick={handleGenerateInvoice}
                                        disabled={generating}
                                    >
                                        <Calculator className="w-4 h-4 mr-2" />
                                        {generating ? "Generating..." : "Generate Master Invoice"}
                                    </Button>
                                ) : (
                                    <div className="bg-emerald-50 text-emerald-700 p-3 rounded-md text-sm flex items-center gap-2 border border-emerald-200">
                                        <CheckCircle className="w-4 h-4" /> All runs in this period have been billed.
                                    </div>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
