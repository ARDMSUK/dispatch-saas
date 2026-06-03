"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Plus, Search, User, Pencil, Trash2, X, MoreHorizontal, Power, CheckCircle, Clock, FileText } from "lucide-react";
import { toast } from "sonner";

export default function PassengerAssistantsPage() {
    const [pas, setPas] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    // Form State
    const [formData, setFormData] = useState({
        name: "",
        callsign: "",
        phone: "",
        email: "",
        gender: "MALE",
        payRatePerHour: 11.44,
        status: "OFF_DUTY"
    });

    const fetchPas = async () => {
        try {
            const res = await fetch("/api/staff/pas");
            if (!res.ok) throw new Error("Failed to fetch Passenger Assistants");
            const data = await res.json();
            setPas(data);
        } catch (error) {
            console.error(error);
            toast.error("Failed to load passenger assistants");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPas();
    }, []);

    const resetForm = () => {
        setFormData({
            name: "",
            callsign: "",
            phone: "",
            email: "",
            gender: "MALE",
            payRatePerHour: 11.44,
            status: "OFF_DUTY"
        });
        setEditingId(null);
    };

    const handleOpenChange = (open: boolean) => {
        setIsDialogOpen(open);
        if (!open) resetForm();
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name || !formData.callsign || !formData.phone) {
            toast.error("Name, Callsign, and Phone are required.");
            return;
        }

        try {
            const url = editingId ? `/api/staff/pas/${editingId}` : "/api/staff/pas";
            const method = editingId ? "PATCH" : "POST";

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                toast.success(editingId ? "Passenger Assistant updated" : "Passenger Assistant added");
                setIsDialogOpen(false);
                resetForm();
                fetchPas();
            } else {
                const err = await res.json();
                toast.error(err.error || "Failed to save assistant");
            }
        } catch (error) {
            console.error(error);
            toast.error("An error occurred during save");
        }
    };

    const handleEdit = (pa: any) => {
        setFormData({
            name: pa.name,
            callsign: pa.callsign,
            phone: pa.phone,
            email: pa.email || "",
            gender: pa.gender || "MALE",
            payRatePerHour: pa.payRatePerHour || 11.44,
            status: pa.status || "OFF_DUTY"
        });
        setEditingId(pa.id);
        setIsDialogOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this assistant?")) return;
        try {
            const res = await fetch(`/api/staff/pas/${id}`, {
                method: "DELETE"
            });
            if (res.ok) {
                toast.success("Passenger Assistant deleted");
                fetchPas();
            } else {
                toast.error("Failed to delete assistant");
            }
        } catch (error) {
            console.error(error);
        }
    };

    const updateStatus = async (paId: string, newStatus: string) => {
        try {
            const res = await fetch(`/api/staff/pas/${paId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: newStatus })
            });
            if (res.ok) {
                toast.success(`Status updated to ${newStatus.replace('_', ' ')}`);
                fetchPas();
            }
        } catch (error) {
            console.error(error);
        }
    };

    const filteredPas = pas.filter(pa =>
        pa.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        pa.callsign.toLowerCase().includes(searchTerm.toLowerCase()) ||
        pa.phone.includes(searchTerm)
    );

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "ACTIVE":
                return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 flex items-center gap-1 w-fit"><CheckCircle className="h-3 w-3" /> ACTIVE</Badge>;
            case "OFF_DUTY":
                return <Badge className="bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 flex items-center gap-1 w-fit"><Clock className="h-3 w-3" /> OFF DUTY</Badge>;
            case "SUSPENDED":
                return <Badge className="bg-red-50 text-red-700 border-red-200 hover:bg-red-100 flex items-center gap-1 w-fit"><Power className="h-3 w-3" /> SUSPENDED</Badge>;
            default:
                return <Badge className="bg-slate-50 text-slate-700 border-slate-200 w-fit">{status}</Badge>;
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto h-full overflow-auto space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">Passenger Assistants</h1>
                    <p className="text-slate-500 mt-1">Manage vetted school run passenger assistants (PAs) and monitors.</p>
                </div>

                <Dialog open={isDialogOpen} onOpenChange={handleOpenChange}>
                    <DialogTrigger asChild>
                        <Button className="bg-blue-700 hover:bg-blue-800 text-white shadow-md">
                            <Plus className="mr-2 h-4 w-4" /> Add Assistant
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[450px] bg-white border-slate-200">
                        <DialogHeader>
                            <DialogTitle className="text-xl font-bold text-slate-900">
                                {editingId ? "Edit Passenger Assistant" : "Add Passenger Assistant"}
                            </DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSave} className="space-y-4 pt-4">
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-slate-500 uppercase">Assistant Name *</label>
                                <Input
                                    placeholder="e.g. Jane Doe"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-slate-500 uppercase">Callsign / Code *</label>
                                    <Input
                                        placeholder="e.g. PA-05"
                                        value={formData.callsign}
                                        onChange={e => setFormData({ ...formData, callsign: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-slate-500 uppercase">Gender *</label>
                                    <select
                                        className="w-full flex h-10 items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                                        value={formData.gender}
                                        onChange={e => setFormData({ ...formData, gender: e.target.value })}
                                    >
                                        <option value="MALE">Male</option>
                                        <option value="FEMALE">Female</option>
                                        <option value="OTHER">Other</option>
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-slate-500 uppercase">Phone Number *</label>
                                    <Input
                                        placeholder="Mobile / Phone"
                                        value={formData.phone}
                                        onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-slate-500 uppercase">Pay Rate (£ / Hr) *</label>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        value={formData.payRatePerHour}
                                        onChange={e => setFormData({ ...formData, payRatePerHour: parseFloat(e.target.value) })}
                                        required
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-slate-500 uppercase">Email Address</label>
                                <Input
                                    type="email"
                                    placeholder="email@example.com"
                                    value={formData.email}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit" className="bg-slate-900 text-white">
                                    Save Assistant
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="flex gap-2">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                        placeholder="Search PAs by name, callsign or phone..."
                        className="pl-9 bg-white"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <Card className="bg-white border-slate-200 overflow-hidden">
                <Table>
                    <TableHeader className="bg-slate-50">
                        <TableRow className="border-slate-200">
                            <TableHead className="text-slate-500 w-[100px]">Callsign</TableHead>
                            <TableHead className="text-slate-500">Name</TableHead>
                            <TableHead className="text-slate-500">Contact</TableHead>
                            <TableHead className="text-slate-500">Gender</TableHead>
                            <TableHead className="text-slate-500 text-right">Pay Rate</TableHead>
                            <TableHead className="text-slate-500 w-[140px]">Status</TableHead>
                            <TableHead className="w-[100px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={7} className="h-32 text-center text-slate-400">
                                    <div className="flex justify-center items-center space-x-2">
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-500"></div>
                                        <span>Loading passenger assistants...</span>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : filteredPas.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="h-48 text-center text-slate-400">
                                    <User className="w-8 h-8 mx-auto mb-2 opacity-25" />
                                    No passenger assistants registered yet.
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredPas.map(pa => (
                                <TableRow key={pa.id} className="border-slate-200 hover:bg-slate-50/50">
                                    <TableCell className="font-bold text-indigo-700 font-mono">{pa.callsign}</TableCell>
                                    <TableCell className="font-semibold text-slate-800">{pa.name}</TableCell>
                                    <TableCell>
                                        <div className="flex flex-col text-sm text-slate-600">
                                            <span>{pa.phone}</span>
                                            {pa.email && <span className="text-xs text-slate-400">{pa.email}</span>}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-slate-600 text-sm font-medium capitalize">{pa.gender.toLowerCase()}</TableCell>
                                    <TableCell className="text-right font-mono font-bold text-slate-900">£{(pa.payRatePerHour || 0).toFixed(2)}/hr</TableCell>
                                    <TableCell>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <button className="cursor-pointer focus:outline-none">
                                                    {getStatusBadge(pa.status)}
                                                </button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent className="bg-white border-slate-200 text-slate-800">
                                                <DropdownMenuItem onClick={() => updateStatus(pa.id, 'ACTIVE')} className="cursor-pointer flex items-center gap-1.5"><CheckCircle className="h-3.5 w-3.5 text-emerald-500" /> Active</DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => updateStatus(pa.id, 'OFF_DUTY')} className="cursor-pointer flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-slate-400" /> Off Duty</DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => updateStatus(pa.id, 'SUSPENDED')} className="cursor-pointer flex items-center gap-1.5"><Power className="h-3.5 w-3.5 text-red-500" /> Suspended</DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-slate-900">
                                                    <MoreHorizontal className="w-4 h-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent className="bg-white border-slate-200 text-slate-800" align="end">
                                                <DropdownMenuItem onClick={() => handleEdit(pa)} className="cursor-pointer flex items-center gap-1.5"><Pencil className="h-3.5 w-3.5" /> Edit Profile</DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleDelete(pa.id)} className="cursor-pointer text-red-600 focus:text-red-700 focus:bg-red-50 focus:outline-none flex items-center gap-1.5"><Trash2 className="h-3.5 w-3.5" /> Delete Assistant</DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </Card>
        </div>
    );
}
