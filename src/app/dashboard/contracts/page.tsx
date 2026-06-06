"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Search, Building2, MapPin, AlertCircle, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";

export default function SchoolContractsPage() {
    const router = useRouter();
    const [contracts, setContracts] = useState<any[]>([]);
    const [accounts, setAccounts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        name: "",
        reference: "",
        purchaseOrderNo: "",
        accountId: "",
        startDate: "",
        endDate: "",
        notes: ""
    });
    const [saving, setSaving] = useState(false);

    const fetchContractsAndAccounts = async () => {
        try {
            const [contractsRes, accountsRes] = await Promise.all([
                fetch("/api/contracts"),
                fetch("/api/accounts")
            ]);

            if (contractsRes.ok) {
                setContracts(await contractsRes.json());
            }
            if (accountsRes.ok) {
                setAccounts(await accountsRes.json());
            }
        } catch (error) {
            console.error("Failed to load contracts data", error);
            toast.error("Failed to load page data");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchContractsAndAccounts();
    }, []);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name || !formData.reference || !formData.accountId) {
            toast.error("Contract Name, Reference, and Billed Account are required.");
            return;
        }

        setSaving(true);
        try {
            const res = await fetch("/api/contracts", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                toast.success("Contract created successfully");
                setIsDialogOpen(false);
                setFormData({
                    name: "",
                    reference: "",
                    purchaseOrderNo: "",
                    accountId: "",
                    startDate: "",
                    endDate: "",
                    notes: ""
                });
                fetchContractsAndAccounts();
            } else {
                const err = await res.json();
                toast.error(err.error || "Failed to create contract");
            }
        } catch (error) {
            console.error(error);
            toast.error("An error occurred while creating the contract");
        } finally {
            setSaving(false);
        }
    };

    const filteredContracts = contracts.filter((contract: any) =>
        contract.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contract.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (contract.account?.name && contract.account.name.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="p-6 max-w-7xl mx-auto h-full overflow-auto space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">School Contracts</h1>
                    <p className="text-slate-500 mt-1">Manage Local Authority SEN transport and home-to-school routes.</p>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="outline" className="border-indigo-200 text-indigo-700 bg-indigo-50" onClick={() => router.push("/dashboard/contracts/billing")}>
                        Billing Engine
                    </Button>
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                            <Button className="bg-indigo-600 hover:bg-purple-600 text-white shadow-md">
                                <Plus className="mr-2 h-4 w-4" /> New Contract
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[550px] bg-white border-slate-200">
                            <DialogHeader>
                                <DialogTitle className="text-xl font-bold text-slate-900">Create New School Contract</DialogTitle>
                            </DialogHeader>
                            <form onSubmit={handleSave} className="space-y-4 pt-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2 col-span-2">
                                        <label className="text-xs font-semibold text-slate-500 uppercase">Contract Name *</label>
                                        <Input
                                            placeholder="e.g. SEN School Transport 2026"
                                            value={formData.name}
                                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold text-slate-500 uppercase">Reference Code *</label>
                                        <Input
                                            placeholder="e.g. LA-SEN-26"
                                            value={formData.reference}
                                            onChange={e => setFormData({ ...formData, reference: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold text-slate-500 uppercase">Purchase Order (PO) #</label>
                                        <Input
                                            placeholder="e.g. PO-89021"
                                            value={formData.purchaseOrderNo}
                                            onChange={e => setFormData({ ...formData, purchaseOrderNo: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2 col-span-2">
                                        <label className="text-xs font-semibold text-slate-500 uppercase">Billed Corporate/LA Account *</label>
                                        <select
                                            className="w-full flex h-10 items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                                            value={formData.accountId}
                                            onChange={e => setFormData({ ...formData, accountId: e.target.value })}
                                            required
                                        >
                                            <option value="">Select Account...</option>
                                            {accounts.map(acc => (
                                                <option key={acc.id} value={acc.id}>{acc.name} ({acc.code})</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold text-slate-500 uppercase">Start Date</label>
                                        <Input
                                            type="date"
                                            value={formData.startDate}
                                            onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold text-slate-500 uppercase">End Date</label>
                                        <Input
                                            type="date"
                                            value={formData.endDate}
                                            onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2 col-span-2">
                                        <label className="text-xs font-semibold text-slate-500 uppercase">Notes & Special Requirements</label>
                                        <Textarea
                                            placeholder="Write any contract constraints, invoice instructions or general remarks..."
                                            value={formData.notes}
                                            onChange={e => setFormData({ ...formData, notes: e.target.value })}
                                            className="h-20 resize-none"
                                        />
                                    </div>
                                </div>
                                <div className="flex justify-end gap-2 pt-2">
                                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                                        Cancel
                                    </Button>
                                    <Button type="submit" className="bg-indigo-600 text-white" disabled={saving}>
                                        {saving ? "Saving..." : "Save Contract"}
                                    </Button>
                                </div>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                    <div className="text-slate-500 text-sm font-medium mb-1">Active Contracts</div>
                    <div className="text-2xl font-bold text-slate-900">
                        {loading ? "..." : contracts.filter((c: any) => c.status === 'ACTIVE').length}
                    </div>
                </div>
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                    <div className="text-slate-500 text-sm font-medium mb-1">Total Routes</div>
                    <div className="text-2xl font-bold text-slate-900">
                        {loading ? "..." : contracts.reduce((acc: number, c: any) => acc + (c.routes?.length || 0), 0)}
                    </div>
                </div>
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                    <div className="text-slate-500 text-sm font-medium mb-1">Compliance Alerts</div>
                    <div className="text-2xl font-bold text-purple-600 flex items-center gap-2">
                        0 <AlertCircle className="h-4 w-4" />
                    </div>
                </div>
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                    <div className="text-slate-500 text-sm font-medium mb-1">Monthly Value</div>
                    <div className="text-2xl font-bold text-emerald-600">£0.00</div>
                </div>
            </div>

            {/* Contracts List */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <h2 className="font-semibold text-slate-800">Local Authority Contracts</h2>
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            type="text"
                            placeholder="Search contracts..."
                            className="pl-9 bg-white"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="divide-y divide-slate-100">
                    {loading ? (
                        <div className="p-12 text-center text-slate-500">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-500 mx-auto mb-2"></div>
                            <span>Loading contracts...</span>
                        </div>
                    ) : filteredContracts.length === 0 ? (
                        <div className="p-12 text-center text-slate-500">
                            <Building2 className="mx-auto h-12 w-12 text-slate-300 mb-3" />
                            <h3 className="text-lg font-medium text-slate-900 mb-1">No Contracts Found</h3>
                            <p className="text-sm">You haven't set up any school contracts yet.</p>
                            <Button
                                variant="outline"
                                className="mt-4 border-blue-200 text-indigo-600 bg-blue-50"
                                onClick={() => setIsDialogOpen(true)}
                            >
                                Create First Contract
                            </Button>
                        </div>
                    ) : (
                        filteredContracts.map((contract: any) => (
                            <div
                                key={contract.id}
                                className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between cursor-pointer group"
                                onClick={() => router.push(`/dashboard/contracts/${contract.id}`)}
                            >
                                <div className="flex gap-4 items-center">
                                    <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                        <Building2 className="h-5 w-5 text-indigo-600" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-semibold text-slate-900">{contract.name}</h3>
                                            <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-200 font-mono">
                                                {contract.status}
                                            </span>
                                        </div>
                                        <p className="text-sm text-slate-500 flex items-center gap-2 mt-1">
                                            <span>Ref: {contract.reference}</span>
                                            <span>•</span>
                                            <span>{contract.account?.name}</span>
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-6 text-sm text-slate-500">
                                    <div className="flex flex-col items-end">
                                        <div className="flex items-center gap-1 font-medium text-slate-700">
                                            <MapPin className="h-3.5 w-3.5" />
                                            {contract.routes?.length || 0} Routes
                                        </div>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            router.push(`/dashboard/contracts/${contract.id}`);
                                        }}
                                    >
                                        Manage
                                    </Button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
