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
        <div className="h-full flex flex-col p-4 bg-black/95 gap-4 text-zinc-100">
            <div className="flex justify-between items-center border-b border-white/10 pb-4">
                <div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">Fleet Management</h1>
                    <p className="text-zinc-500 text-sm">Manage your drivers and their availability.</p>
                </div>
                {isAdmin && (
                    <Dialog open={isDialogOpen} onOpenChange={handleOpenChange}>
                        <DialogTrigger asChild>
                            <Button className="bg-amber-500 text-black hover:bg-amber-400 font-bold">
                                <Plus className="mr-2 h-4 w-4" /> Add Driver
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-zinc-900 border-white/10 text-white">
                            <DialogHeader>
                                <DialogTitle>{editingId ? 'Edit Driver' : 'Add New Driver'}</DialogTitle>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <Input
                                        placeholder="Callsign (e.g. 101)"
                                        value={formData.callsign}
                                        onChange={e => setFormData({ ...formData, callsign: e.target.value })}
                                        className="bg-zinc-950 border-white/10"
                                    />
                                    <Input
                                        placeholder="Full Name"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        className="bg-zinc-950 border-white/10"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <Input
                                        placeholder="Phone Number"
                                        value={formData.phone}
                                        onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                        className="bg-zinc-950 border-white/10"
                                    />
                                    <Input
                                        placeholder="Email Address (Optional)"
                                        value={formData.email}
                                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                                        className="bg-zinc-950 border-white/10"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <Input
                                        placeholder="Badge Number"
                                        value={formData.badgeNumber}
                                        onChange={e => setFormData({ ...formData, badgeNumber: e.target.value })}
                                        className="bg-zinc-950 border-white/10"
                                    />
                                    <div className="space-y-1">
                                        <Input
                                            type="date"
                                            placeholder="License Expiry"
                                            value={formData.licenseExpiry ? formData.licenseExpiry.split('T')[0] : ''}
                                            onChange={e => setFormData({ ...formData, licenseExpiry: new Date(e.target.value).toISOString() })}
                                            className="bg-zinc-950 border-white/10"
                                        />
                                    </div>
                                </div>
                                <Input
                                    placeholder="Login PIN (4 digits)"
                                    value={formData.pin}
                                    onChange={e => setFormData({ ...formData, pin: e.target.value })}
                                    className="bg-zinc-950 border-white/10"
                                />
                                <Button onClick={handleSave} className="w-full bg-amber-500 text-black hover:bg-amber-400">
                                    {editingId ? 'Update Driver' : 'Create Driver'}
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                )}
            </div>

            <div className="flex gap-2">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-zinc-500" />
                    <Input
                        placeholder="Search drivers..."
                        className="pl-8 bg-zinc-900 border-white/10 text-white placeholder:text-zinc-600"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="rounded-md border border-white/10 overflow-hidden bg-zinc-900/50">
                <Table>
                    <TableHeader className="bg-zinc-900 border-b border-white/10">
                        <TableRow className="hover:bg-zinc-900 border-white/10">
                            <TableHead className="w-[100px] text-zinc-400">Callsign</TableHead>
                            <TableHead className="text-zinc-400">Name</TableHead>
                            <TableHead className="text-zinc-400">Status</TableHead>
                            <TableHead className="text-zinc-400">Contact</TableHead>
                            <TableHead className="text-zinc-400">Vehicle</TableHead>
                            <TableHead className="text-zinc-400">Badge</TableHead>
                            <TableHead className="text-zinc-400">Expiry</TableHead>
                            {isAdmin && <TableHead className="text-right text-zinc-400">Actions</TableHead>}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={isAdmin ? 8 : 7} className="text-center py-12 text-zinc-500">Loading fleet data...</TableCell>
                            </TableRow>
                        ) : filteredDrivers.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={isAdmin ? 8 : 7} className="text-center py-12 text-zinc-500">No drivers found matches.</TableCell>
                            </TableRow>
                        ) : (
                            filteredDrivers.map((driver) => (
                                <TableRow key={driver.id} className="hover:bg-white/5 border-white/5 group transition-colors">
                                    <TableCell className="font-bold font-mono text-lg text-amber-500">{driver.callsign}</TableCell>
                                    <TableCell className="font-medium text-white">{driver.name}</TableCell>
                                    <TableCell>
                                        <DriverStatusCell driver={driver} onUpdate={fetchDrivers} />
                                    </TableCell>
                                    <TableCell className="text-sm text-zinc-300">{driver.phone}</TableCell>
                                    <TableCell>
                                        {driver.vehicles?.[0] ? (
                                            <div className="flex items-center gap-2 text-sm text-indigo-300">
                                                <Car className="h-3 w-3" />
                                                <span>{driver.vehicles[0].reg} <span className="text-zinc-500">({driver.vehicles[0].make})</span></span>
                                            </div>
                                        ) : <span className="text-zinc-600 text-xs italic">Unassigned</span>}
                                    </TableCell>
                                    <TableCell className="text-sm font-mono text-zinc-400">{driver.badgeNumber || '-'}</TableCell>
                                    <TableCell className="text-xs text-zinc-400">
                                        {driver.licenseExpiry ? new Date(driver.licenseExpiry).toLocaleDateString() : '-'}
                                    </TableCell>
                                    {isAdmin && (
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-white/10" onClick={() => handleEdit(driver)}>
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
            case 'BUSY': return 'bg-amber-500/20 text-amber-500 border-amber-500/20';
            case 'POB': return 'bg-blue-500/20 text-blue-500 border-blue-500/20';
            case 'OFF_DUTY': return 'bg-zinc-800 text-zinc-500 border-zinc-700';
            default: return 'bg-zinc-800 text-zinc-500';
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
            <DropdownMenuContent align="start" className="bg-zinc-900 border-white/10 text-white">
                <DropdownMenuItem onClick={() => updateStatus('FREE')} className="text-emerald-500 focus:bg-emerald-500/10 focus:text-emerald-400">
                    <CheckCircle className="mr-2 h-4 w-4" /> Set FREE
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => updateStatus('BUSY')} className="text-amber-500 focus:bg-amber-500/10 focus:text-amber-400">
                    <Clock className="mr-2 h-4 w-4" /> Set BUSY
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => updateStatus('OFF_DUTY')} className="text-zinc-500 focus:bg-zinc-800 focus:text-zinc-400">
                    <Power className="mr-2 h-4 w-4" /> Set OFF DUTY
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
