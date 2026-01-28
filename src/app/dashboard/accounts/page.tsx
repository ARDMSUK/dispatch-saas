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

    // Form State
    const [formData, setFormData] = useState({
        code: "",
        name: "",
        email: "",
        phone: "",
        address: "",
        notes: "",
        isActive: true
    });

    const fetchAccounts = async () => {
        try {
            const res = await fetch("/api/accounts");
            const data = await res.json();
            setAccounts(data);
        } catch (error) {
            console.error("Failed to fetch accounts", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAccounts();
    }, []);

    const resetForm = () => {
        setFormData({ code: "", name: "", email: "", phone: "", address: "", notes: "", isActive: true });
        setEditingId(null);
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
            code: account.code,
            name: account.name,
            email: account.email || "",
            phone: account.phone || "",
            address: account.address || "",
            notes: account.notes || "",
            isActive: account.isActive
        });
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

    const filteredAccounts = accounts.filter(a =>
        a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.code.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="h-full flex flex-col p-4 bg-zinc-50 gap-4">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-zinc-800">Account Management</h1>
                <Dialog open={isDialogOpen} onOpenChange={handleOpenChange}>
                    <DialogTrigger asChild>
                        <Button className="bg-zinc-800 hover:bg-zinc-700">
                            <Plus className="mr-2 h-4 w-4" /> Add Account
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{editingId ? 'Edit Account' : 'Add New Account'}</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-[1fr_2fr] gap-4">
                                <Input
                                    placeholder="Code (e.g. ACC-001)"
                                    value={formData.code}
                                    onChange={e => setFormData({ ...formData, code: e.target.value })}
                                />
                                <Input
                                    placeholder="Account Name"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <Input
                                    placeholder="Email for Invoicing"
                                    value={formData.email}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                />
                                <Input
                                    placeholder="Phone"
                                    value={formData.phone}
                                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                />
                            </div>
                            <Input
                                placeholder="Billing Address"
                                value={formData.address}
                                onChange={e => setFormData({ ...formData, address: e.target.value })}
                            />
                            <Input
                                placeholder="Notes"
                                value={formData.notes}
                                onChange={e => setFormData({ ...formData, notes: e.target.value })}
                            />
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
                            <Button onClick={handleSave} className="w-full bg-zinc-800">
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
                        className="pl-8 bg-white"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <Card className="flex-1 overflow-hidden">
                <div className="overflow-auto max-h-full">
                    <Table>
                        <TableHeader className="bg-zinc-100 sticky top-0">
                            <TableRow>
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
                                    <TableRow key={account.id} className="hover:bg-zinc-50 group">
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
                                        <TableCell className="text-sm truncate max-w-[200px]">{account.address || '-'}</TableCell>
                                        <TableCell>
                                            <Badge variant={account.isActive ? 'default' : 'destructive'} className={account.isActive ? "bg-green-600" : ""}>
                                                {account.isActive ? 'ACTIVE' : 'SUSPENDED'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-500 hover:text-zinc-900" onClick={() => handleEdit(account)}>
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-700 hover:bg-red-50" onClick={() => handleDelete(account.id)}>
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
