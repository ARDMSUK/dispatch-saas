"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Account } from "@/lib/types";
import { Plus, Search, Building2, Phone, Mail, Pencil, Trash2 } from "lucide-react";

export default function AccountsPage() {
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    // Portal User State
    const [portalUserEmail, setPortalUserEmail] = useState("");
    const [portalUserPassword, setPortalUserPassword] = useState("");
    const [isCreatingPortalUser, setIsCreatingPortalUser] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        code: "",
        name: "",
        email: "",
        phone: "",

        // New Contact Fields
        contactName: "",
        contactJobTitle: "",
        department: "",

        // New Address Fields
        addressLine1: "",
        addressLine2: "",
        townCity: "",
        postcode: "",

        // Billing and Accounts Payable
        isAuthorisedToSetAccount: false,
        apContact: "",
        apPhone: "",
        apEmail: "",
        paymentTerms: "",

        // Contract
        startDate: "",
        endDate: "",

        notes: "",
        isActive: true
    });

    const fetchAccounts = async () => {
        try {
            const res = await fetch("/api/accounts");
            if (!res.ok) throw new Error("Failed to fetch accounts");

            const data = await res.json();
            if (Array.isArray(data)) {
                setAccounts(data);
            } else {
                console.error("Invalid accounts data:", data);
                setAccounts([]);
            }
        } catch (error) {
            console.error("Failed to fetch accounts", error);
            setAccounts([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAccounts();
    }, []);

    const resetForm = () => {
        setFormData({
            code: "", name: "", email: "", phone: "",
            contactName: "", contactJobTitle: "", department: "",
            addressLine1: "", addressLine2: "", townCity: "", postcode: "",
            isAuthorisedToSetAccount: false, apContact: "", apPhone: "", apEmail: "", paymentTerms: "",
            startDate: "", endDate: "",
            notes: "", isActive: true
        });
        setEditingId(null);
        setPortalUserEmail("");
        setPortalUserPassword("");
    };

    const handleOpenChange = (open: boolean) => {
        setIsDialogOpen(open);
        if (!open) resetForm();
    };

    const handleSave = async () => {
        try {
            const url = editingId ? `/api/accounts/${editingId}` : "/api/accounts";
            const method = editingId ? "PATCH" : "POST";

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                setIsDialogOpen(false);
                resetForm();
                fetchAccounts();
            } else {
                const error = await res.json();
                alert(`Failed to ${editingId ? 'update' : 'create'} account: ${error.message || error.error}`);
            }
        } catch (error) {
            console.error("Error saving account", error);
        }
    };

    const handleEdit = (account: Account) => {
        setEditingId(account.id);
        setFormData({
            code: account.code || "",
            name: account.name || "",
            email: account.email || "",
            phone: account.phone || "",

            contactName: account.contactName || "",
            contactJobTitle: account.contactJobTitle || "",
            department: account.department || "",

            addressLine1: account.addressLine1 || "",
            addressLine2: account.addressLine2 || "",
            townCity: account.townCity || "",
            postcode: account.postcode || "",

            isAuthorisedToSetAccount: account.isAuthorisedToSetAccount || false,
            apContact: account.apContact || "",
            apPhone: account.apPhone || "",
            apEmail: account.apEmail || "",
            paymentTerms: account.paymentTerms || "",

            startDate: account.startDate ? new Date(account.startDate).toISOString().substring(0, 10) : "",
            endDate: account.endDate ? new Date(account.endDate).toISOString().substring(0, 10) : "",

            notes: account.notes || "",
            isActive: account.isActive
        });
        setPortalUserEmail("");
        setPortalUserPassword("");
        setIsDialogOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this account?")) return;

        try {
            const res = await fetch(`/api/accounts/${id}`, { method: "DELETE" });
            if (res.ok) {
                fetchAccounts();
            } else {
                alert("Failed to delete account");
            }
        } catch (error) {
            console.error("Error deleting account", error);
        }
    };

    const handleCreatePortalUser = async () => {
        if (!editingId || !portalUserEmail || !portalUserPassword) return;
        setIsCreatingPortalUser(true);
        try {
            const res = await fetch(`/api/accounts/${editingId}/portal-user`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: portalUserEmail, password: portalUserPassword })
            });
            if (res.ok) {
                setPortalUserEmail("");
                setPortalUserPassword("");
                fetchAccounts(); // Refresh to get the new user in the list
                alert("Portal user created successfully! They can now log in.");
            } else {
                const err = await res.json();
                alert(`Failed to create user: ${err.error || err.message}`);
            }
        } catch (error) {
            console.error("Error creating portal user:", error);
            alert("Failed to create portal user.");
        } finally {
            setIsCreatingPortalUser(false);
        }
    };

    const filteredAccounts = accounts.filter(a =>
        a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.code.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="h-full flex flex-col p-4 gap-4">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">Account Management</h1>
                <Dialog open={isDialogOpen} onOpenChange={handleOpenChange}>
                    <DialogTrigger asChild>
                        <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                            <Plus className="mr-2 h-4 w-4" /> Add Account
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{editingId ? 'Edit Account' : 'Add New Account'}</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-6 py-4 max-h-[70vh] overflow-y-auto px-1">
                            {/* General Information */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-semibold border-b border-zinc-800 pb-2">General Information</h3>
                                <div className="grid grid-cols-[1fr_2fr] gap-4">
                                    <div className="space-y-1">
                                        <label className="text-xs font-medium text-zinc-400">Account Code *</label>
                                        <Input
                                            placeholder="Code (e.g. ACC-001)"
                                            value={formData.code}
                                            onChange={e => setFormData({ ...formData, code: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-medium text-zinc-400">Company Name *</label>
                                        <Input
                                            placeholder="Company Name"
                                            value={formData.name}
                                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-xs font-medium text-zinc-400">General Email</label>
                                        <Input
                                            placeholder="General Email"
                                            value={formData.email}
                                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-medium text-zinc-400">General Phone</label>
                                        <Input
                                            placeholder="General Phone"
                                            value={formData.phone}
                                            onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Primary Contact */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-semibold border-b border-zinc-800 pb-2">Primary Contact</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-xs font-medium text-zinc-400">Full Name</label>
                                        <Input placeholder="Full Name" value={formData.contactName} onChange={e => setFormData({ ...formData, contactName: e.target.value })} />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-medium text-zinc-400">Job Title</label>
                                        <Input placeholder="Job Title" value={formData.contactJobTitle} onChange={e => setFormData({ ...formData, contactJobTitle: e.target.value })} />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-medium text-zinc-400">Department</label>
                                        <Input placeholder="Department" value={formData.department} onChange={e => setFormData({ ...formData, department: e.target.value })} />
                                    </div>
                                </div>
                            </div>

                            {/* Address */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-semibold border-b border-zinc-800 pb-2">Address</h3>
                                <div className="space-y-4">
                                    <div className="space-y-1">
                                        <label className="text-xs font-medium text-zinc-400">Address Line 1</label>
                                        <Input placeholder="Address Line 1" value={formData.addressLine1} onChange={e => setFormData({ ...formData, addressLine1: e.target.value })} />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-medium text-zinc-400">Address Line 2</label>
                                        <Input placeholder="Address Line 2" value={formData.addressLine2} onChange={e => setFormData({ ...formData, addressLine2: e.target.value })} />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-xs font-medium text-zinc-400">Town / City</label>
                                            <Input placeholder="Town / City" value={formData.townCity} onChange={e => setFormData({ ...formData, townCity: e.target.value })} />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-medium text-zinc-400">Postcode</label>
                                            <Input placeholder="Postcode" value={formData.postcode} onChange={e => setFormData({ ...formData, postcode: e.target.value })} />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Billing and Accounts Payable */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-semibold border-b border-zinc-800 pb-2">Billing & Accounts Payable</h3>
                                <div className="flex items-center space-x-2 py-2">
                                    <input
                                        type="checkbox"
                                        id="authorised"
                                        checked={formData.isAuthorisedToSetAccount}
                                        onChange={e => setFormData({ ...formData, isAuthorisedToSetAccount: e.target.checked })}
                                        className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                                    />
                                    <label htmlFor="authorised" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                        Authorised to set account?
                                    </label>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-xs font-medium text-zinc-400">Accounts Payable Contact</label>
                                        <Input placeholder="AP Contact Name" value={formData.apContact} onChange={e => setFormData({ ...formData, apContact: e.target.value })} />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-medium text-zinc-400">Payment Terms</label>
                                        <Select value={formData.paymentTerms || "monthly"} onValueChange={(val) => setFormData({ ...formData, paymentTerms: val })}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select terms" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="weekly">Weekly</SelectItem>
                                                <SelectItem value="bi-weekly">Bi-Weekly</SelectItem>
                                                <SelectItem value="monthly">Monthly</SelectItem>
                                                <SelectItem value="net-30">Net 30</SelectItem>
                                                <SelectItem value="net-60">Net 60</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-xs font-medium text-zinc-400">Accounts Payable Email</label>
                                        <Input placeholder="AP Email" value={formData.apEmail} onChange={e => setFormData({ ...formData, apEmail: e.target.value })} />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-medium text-zinc-400">Accounts Payable Tel</label>
                                        <Input placeholder="AP Phone" value={formData.apPhone} onChange={e => setFormData({ ...formData, apPhone: e.target.value })} />
                                    </div>
                                </div>
                            </div>

                            {/* Contract Details */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-semibold border-b border-zinc-800 pb-2">Contract Details</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-xs font-medium text-zinc-400">Start Date</label>
                                        <Input type="date" value={formData.startDate} onChange={e => setFormData({ ...formData, startDate: e.target.value })} />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-medium text-zinc-400">End Date</label>
                                        <Input type="date" value={formData.endDate} onChange={e => setFormData({ ...formData, endDate: e.target.value })} />
                                    </div>
                                </div>
                            </div>

                            {/* Portal Users Management (Only when editing) */}
                            {editingId && (
                                <div className="space-y-4">
                                    <h3 className="text-sm font-semibold border-b border-zinc-800 pb-2">B2B Portal Access</h3>

                                    {/* Existing Users List */}
                                    <div className="space-y-2">
                                        <label className="text-xs font-medium text-zinc-400">Existing Portal Logins</label>
                                        <div className="bg-zinc-900/50 rounded-md p-2 space-y-2 max-h-32 overflow-y-auto border border-zinc-800">
                                            {(() => {
                                                const currentAccount = accounts.find(a => a.id === editingId);
                                                if (!currentAccount?.users || currentAccount.users.length === 0) {
                                                    return <p className="text-xs text-zinc-500 italic p-2">No portal users exist for this account yet.</p>;
                                                }
                                                return currentAccount.users.map(u => (
                                                    <div key={u.id} className="flex justify-between items-center text-sm p-2 bg-zinc-950 rounded">
                                                        <div className="flex flex-col">
                                                            <span className="font-medium text-zinc-200">{u.name}</span>
                                                            <span className="text-xs text-zinc-500">{u.email}</span>
                                                        </div>
                                                        <Badge variant="outline" className="text-[10px]">B2B_ADMIN</Badge>
                                                    </div>
                                                ));
                                            })()}
                                        </div>
                                    </div>

                                    {/* Add New Portal User Form */}
                                    <div className="bg-zinc-900/30 p-3 rounded-md border border-zinc-800/50 space-y-3">
                                        <p className="text-xs font-medium text-zinc-300">Invite New Portal User</p>
                                        <div className="grid grid-cols-2 gap-3">
                                            <Input
                                                placeholder="Login Email"
                                                value={portalUserEmail}
                                                onChange={e => setPortalUserEmail(e.target.value)}
                                                className="h-8 text-sm"
                                            />
                                            <Input
                                                placeholder="Secure Password"
                                                type="password"
                                                value={portalUserPassword}
                                                onChange={e => setPortalUserPassword(e.target.value)}
                                                className="h-8 text-sm"
                                            />
                                        </div>
                                        <Button
                                            onClick={handleCreatePortalUser}
                                            disabled={!portalUserEmail || !portalUserPassword || isCreatingPortalUser}
                                            size="sm"
                                            variant="secondary"
                                            className="w-full h-8 text-xs"
                                        >
                                            {isCreatingPortalUser ? "Provisioning..." : "Create Portal Login"}
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {/* Notes */}
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-zinc-400">Internal Notes</label>
                                <Input placeholder="Notes" value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} />
                            </div>
                            {editingId && (
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <label className="text-sm font-medium">Status</label>
                                    <Select
                                        value={formData.isActive ? "active" : "suspended"}
                                        onValueChange={(val) => setFormData({ ...formData, isActive: val === "active" })}
                                    >
                                        <SelectTrigger className="w-[180px]">
                                            <SelectValue placeholder="Status" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="active">Active</SelectItem>
                                            <SelectItem value="suspended">Suspended</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                            <Button onClick={handleSave} className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
                                {editingId ? 'Update Account' : 'Create Account'}
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="flex gap-2 mb-4">
                <div className="relative flex-1">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-zinc-400" />
                    <Input
                        placeholder="Search accounts..."
                        className="pl-8 bg-zinc-900/50 border-zinc-800"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <Card className="flex-1 overflow-hidden bg-zinc-950/50 border-zinc-800">
                <div className="overflow-auto max-h-full">
                    <Table>
                        <TableHeader className="bg-zinc-900/50 sticky top-0">
                            <TableRow className="border-zinc-800">
                                <TableHead className="w-[100px]">Code</TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead>Contact</TableHead>
                                <TableHead>Address</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8">Loading accounts...</TableCell>
                                </TableRow>
                            ) : filteredAccounts.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8 text-zinc-400">No accounts found</TableCell>
                                </TableRow>
                            ) : (
                                filteredAccounts.map((account) => (
                                    <TableRow key={account.id} className="hover:bg-zinc-800/50 group border-zinc-800">
                                        <TableCell className="font-bold font-mono">{account.code}</TableCell>
                                        <TableCell className="font-medium flex items-center gap-2">
                                            <Building2 className="h-4 w-4 text-zinc-400" />
                                            {account.name}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col text-sm text-zinc-600">
                                                <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {account.email || '-'}</span>
                                                <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {account.phone || '-'}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-sm truncate max-w-[200px]">
                                            {account.addressLine1 ? (
                                                <>
                                                    {account.addressLine1} {account.townCity ? `, ${account.townCity}` : ''} {account.postcode ? ` ${account.postcode}` : ''}
                                                </>
                                            ) : '-'}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={account.isActive ? 'default' : 'destructive'} className={account.isActive ? "bg-green-600" : ""}>
                                                {account.isActive ? 'ACTIVE' : 'SUSPENDED'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800" onClick={() => handleEdit(account)}>
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-400 hover:bg-red-950/50" onClick={() => handleDelete(account.id)}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
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
