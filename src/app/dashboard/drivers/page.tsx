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
import { Driver } from "@/lib/types";
import { Plus, Search, Car, Pencil, Trash2, X, MoreHorizontal, Power, CheckCircle, Clock } from "lucide-react";
import { useSession } from "next-auth/react";

export default function DriversPage() {
    const [drivers, setDrivers] = useState<Driver[]>([]);
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
        badgeNumber: "",
        licenseExpiry: "",
        pin: ""
    });

    const fetchDrivers = async () => {
        try {
            const res = await fetch("/api/drivers");
            if (!res.ok) throw new Error("Failed to fetch drivers");

            const data = await res.json();
            if (Array.isArray(data)) {
                setDrivers(data);
            } else {
                console.error("Invalid drivers data:", data);
                setDrivers([]);
            }
        } catch (error) {
            console.error("Failed to fetch drivers", error);
            setDrivers([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDrivers();
    }, []);

    const resetForm = () => {
        setFormData({ name: "", callsign: "", phone: "", email: "", badgeNumber: "", licenseExpiry: "", pin: "" });
        setEditingId(null);
    };

    const handleOpenChange = (open: boolean) => {
        setIsDialogOpen(open);
        if (!open) resetForm();
    };

    const handleSave = async () => {
        try {
            const url = editingId ? `/api/drivers/${editingId}` : "/api/drivers";
            const method = editingId ? "PATCH" : "POST";

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                setIsDialogOpen(false);
                resetForm();
                fetchDrivers();
            } else {
                const error = await res.json();
                alert(`Failed to ${editingId ? 'update' : 'create'} driver: ${error.message || error.error}`);
            }
        } catch (error) {
            console.error("Error saving driver", error);
        }
    };

    const handleEdit = (driver: Driver) => {
        setEditingId(driver.id);
        setFormData({
            name: driver.name,
            callsign: driver.callsign,
            phone: driver.phone,
            email: driver.email || "",
            badgeNumber: driver.badgeNumber || "",
            licenseExpiry: driver.licenseExpiry || "",
            pin: driver.pin || ""
        });
        setIsDialogOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this driver?")) return;

        try {
            const res = await fetch(`/api/drivers/${id}`, { method: "DELETE" });
            if (res.ok) {
                fetchDrivers();
            } else {
                alert("Failed to delete driver");
            }
        } catch (error) {
            console.error("Error deleting driver", error);
        }
    };

    const filteredDrivers = drivers.filter(d =>
        d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.callsign.includes(searchTerm)
    );

    const { data: session } = useSession();
    const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(session?.user?.role as string);

    return (
        <div className="h-full flex flex-col p-4 bg-slate-100 gap-4 text-slate-900">
            <div className="flex justify-between items-center border-b border-slate-200 pb-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Fleet Management</h1>
                    <p className="text-slate-400 text-sm">Manage your drivers and their availability.</p>
                </div>
                {isAdmin && (
                    <Dialog open={isDialogOpen} onOpenChange={handleOpenChange}>
                        <DialogTrigger asChild>
                            <Button className="bg-blue-700 text-black hover:bg-blue-600 font-bold">
                                <Plus className="mr-2 h-4 w-4" /> Add Driver
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-slate-100 border-slate-200 text-slate-900">
                            <DialogHeader>
                                <DialogTitle>{editingId ? 'Edit Driver' : 'Add New Driver'}</DialogTitle>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <Input
                                        placeholder="Callsign (e.g. 101)"
                                        value={formData.callsign}
                                        onChange={e => setFormData({ ...formData, callsign: e.target.value })}
                                        className="bg-white border-slate-200"
                                    />
                                    <Input
                                        placeholder="Full Name"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        className="bg-white border-slate-200"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <Input
                                        placeholder="Phone Number"
                                        value={formData.phone}
                                        onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                        className="bg-white border-slate-200"
                                    />
                                    <Input
                                        placeholder="Email Address (Optional)"
                                        value={formData.email}
                                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                                        className="bg-white border-slate-200"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <Input
                                        placeholder="Badge Number"
                                        value={formData.badgeNumber}
                                        onChange={e => setFormData({ ...formData, badgeNumber: e.target.value })}
                                        className="bg-white border-slate-200"
                                    />
                                    <div className="space-y-1">
                                        <Input
                                            type="date"
                                            placeholder="License Expiry"
                                            value={formData.licenseExpiry ? formData.licenseExpiry.split('T')[0] : ''}
                                            onChange={e => setFormData({ ...formData, licenseExpiry: new Date(e.target.value).toISOString() })}
                                            className="bg-white border-slate-200"
                                        />
                                    </div>
                                </div>
                                <Input
                                    placeholder="Login PIN (4 digits)"
                                    value={formData.pin}
                                    onChange={e => setFormData({ ...formData, pin: e.target.value })}
                                    className="bg-white border-slate-200"
                                />
                                <Button onClick={handleSave} className="w-full bg-blue-700 text-black hover:bg-blue-600">
                                    {editingId ? 'Update Driver' : 'Create Driver'}
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                )}
            </div>

            <div className="flex gap-2">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
                    <Input
                        placeholder="Search drivers..."
                        className="pl-8 bg-slate-100 border-slate-200 text-slate-900 placeholder:text-zinc-600"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="rounded-md border border-slate-200 overflow-hidden bg-slate-100">
                <Table>
                    <TableHeader className="bg-slate-100 border-b border-slate-200">
                        <TableRow className="hover:bg-zinc-900 border-slate-200">
                            <TableHead className="w-[100px] text-slate-500">Callsign</TableHead>
                            <TableHead className="text-slate-500">Name</TableHead>
                            <TableHead className="text-slate-500">Status</TableHead>
                            <TableHead className="text-slate-500">Contact</TableHead>
                            <TableHead className="text-slate-500">Vehicle</TableHead>
                            <TableHead className="text-slate-500">Badge</TableHead>
                            <TableHead className="text-slate-500">Expiry</TableHead>
                            {isAdmin && <TableHead className="text-right text-slate-500">Actions</TableHead>}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={isAdmin ? 8 : 7} className="text-center py-12 text-slate-400">Loading fleet data...</TableCell>
                            </TableRow>
                        ) : filteredDrivers.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={isAdmin ? 8 : 7} className="text-center py-12 text-slate-400">No drivers found matches.</TableCell>
                            </TableRow>
                        ) : (
                            filteredDrivers.map((driver) => (
                                <TableRow key={driver.id} className="hover:bg-slate-200 border-slate-200 group transition-colors">
                                    <TableCell className="font-bold font-mono text-lg text-blue-700">{driver.callsign}</TableCell>
                                    <TableCell className="font-medium text-slate-900">{driver.name}</TableCell>
                                    <TableCell>
                                        <DriverStatusCell driver={driver} onUpdate={fetchDrivers} />
                                    </TableCell>
                                    <TableCell className="text-sm text-slate-600">{driver.phone}</TableCell>
                                    <TableCell>
                                        {driver.vehicles?.[0] ? (
                                            <div className="flex items-center gap-2 text-sm text-indigo-300">
                                                <Car className="h-3 w-3" />
                                                <span>{driver.vehicles[0].reg} <span className="text-slate-400">({driver.vehicles[0].make})</span></span>
                                            </div>
                                        ) : <span className="text-slate-500 text-xs italic">Unassigned</span>}
                                    </TableCell>
                                    <TableCell className="text-sm font-mono text-slate-500">{driver.badgeNumber || '-'}</TableCell>
                                    <TableCell className="text-xs text-slate-500">
                                        {driver.licenseExpiry ? new Date(driver.licenseExpiry).toLocaleDateString() : '-'}
                                    </TableCell>
                                    {isAdmin && (
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-slate-900 hover:bg-slate-200" onClick={() => handleEdit(driver)}>
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-500 hover:bg-red-500/10" onClick={() => handleDelete(driver.id)}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    )}
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}

function DriverStatusCell({ driver, onUpdate }: { driver: Driver; onUpdate: () => void }) {
    const [loading, setLoading] = useState(false);

    const updateStatus = async (newStatus: string) => {
        setLoading(true);
        try {
            await fetch(`/api/drivers/${driver.id}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });
            onUpdate();
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const getBadgeStyle = (status: string) => {
        switch (status) {
            case 'FREE': return 'bg-emerald-500/20 text-emerald-500 border-emerald-500/20';
            case 'BUSY': return 'bg-blue-700/20 text-blue-700 border-blue-700/20';
            case 'POB': return 'bg-blue-500/20 text-blue-500 border-blue-500/20';
            case 'OFF_DUTY': return 'bg-slate-200 text-slate-400 border-slate-300';
            default: return 'bg-slate-200 text-slate-400';
        }
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 p-0 hover:bg-transparent">
                    <Badge className={`cursor-pointer transition-opacity ${getBadgeStyle(driver.status)} border`}>
                        {loading ? '...' : driver.status}
                    </Badge>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="bg-slate-100 border-slate-200 text-slate-900">
                <DropdownMenuItem onClick={() => updateStatus('FREE')} className="text-emerald-500 focus:bg-emerald-500/10 focus:text-emerald-400">
                    <CheckCircle className="mr-2 h-4 w-4" /> Set FREE
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => updateStatus('BUSY')} className="text-blue-700 focus:bg-blue-700/10 focus:text-blue-600">
                    <Clock className="mr-2 h-4 w-4" /> Set BUSY
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => updateStatus('OFF_DUTY')} className="text-slate-400 focus:bg-zinc-800 focus:text-zinc-400">
                    <Power className="mr-2 h-4 w-4" /> Set OFF DUTY
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
