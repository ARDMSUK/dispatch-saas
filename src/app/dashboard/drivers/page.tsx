"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Driver } from "@/lib/types";
import { Plus, Search, Car, Pencil, Trash2, X } from "lucide-react";

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
            const data = await res.json();
            setDrivers(data);
        } catch (error) {
            console.error("Failed to fetch drivers", error);
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

    return (
        <div className="h-full flex flex-col p-4 bg-zinc-50 gap-4">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-zinc-800">Fleet Management</h1>
                <Dialog open={isDialogOpen} onOpenChange={handleOpenChange}>
                    <DialogTrigger asChild>
                        <Button className="bg-zinc-800 hover:bg-zinc-700">
                            <Plus className="mr-2 h-4 w-4" /> Add Driver
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{editingId ? 'Edit Driver' : 'Add New Driver'}</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <Input
                                    placeholder="Callsign (e.g. 101)"
                                    value={formData.callsign}
                                    onChange={e => setFormData({ ...formData, callsign: e.target.value })}
                                />
                                <Input
                                    placeholder="Full Name"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <Input
                                    placeholder="Phone Number"
                                    value={formData.phone}
                                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                />
                                <Input
                                    placeholder="Email Address (Optional)"
                                    value={formData.email}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <Input
                                    placeholder="Badge Number"
                                    value={formData.badgeNumber}
                                    onChange={e => setFormData({ ...formData, badgeNumber: e.target.value })}
                                />
                                <div className="space-y-1">
                                    <Input
                                        type="date"
                                        placeholder="License Expiry"
                                        value={formData.licenseExpiry ? formData.licenseExpiry.split('T')[0] : ''}
                                        onChange={e => setFormData({ ...formData, licenseExpiry: new Date(e.target.value).toISOString() })}
                                    />
                                    <span className="text-[10px] text-zinc-500 ml-1">License Expiry</span>
                                </div>
                            </div>
                            <Input
                                placeholder="Login PIN (4 digits)"
                                value={formData.pin}
                                onChange={e => setFormData({ ...formData, pin: e.target.value })}
                            />
                            <Button onClick={handleSave} className="w-full bg-zinc-800">
                                {editingId ? 'Update Driver' : 'Create Driver'}
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="flex gap-2 mb-4">
                <div className="relative flex-1">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-zinc-400" />
                    <Input
                        placeholder="Search drivers..."
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
                                <TableHead className="w-[80px]">Callsign</TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Contact</TableHead>
                                <TableHead>Vehicle</TableHead>
                                <TableHead>Badge</TableHead>
                                <TableHead>Expiry</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center py-8">Loading drivers...</TableCell>
                                </TableRow>
                            ) : filteredDrivers.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center py-8 text-zinc-400">No drivers found</TableCell>
                                </TableRow>
                            ) : (
                                filteredDrivers.map((driver) => (
                                    <TableRow key={driver.id} className="hover:bg-zinc-50 group">
                                        <TableCell className="font-bold font-mono text-lg">{driver.callsign}</TableCell>
                                        <TableCell className="font-medium">{driver.name}</TableCell>
                                        <TableCell>
                                            <Badge className={
                                                driver.status === 'FREE' ? 'bg-green-500' :
                                                    driver.status === 'BUSY' ? 'bg-orange-500' :
                                                        driver.status === 'POB' ? 'bg-blue-500' :
                                                            'bg-zinc-400'
                                            }>
                                                {driver.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-sm">{driver.phone}</TableCell>
                                        <TableCell>
                                            {driver.vehicle ? (
                                                <div className="flex items-center gap-1 text-sm">
                                                    <Car className="h-3 w-3" />
                                                    <span>{driver.vehicle.reg} ({driver.vehicle.make})</span>
                                                </div>
                                            ) : <span className="text-zinc-400 text-xs italic">No Vehicle</span>}
                                        </TableCell>
                                        <TableCell className="text-sm font-mono">{driver.badgeNumber || '-'}</TableCell>
                                        <TableCell className="text-xs">
                                            {driver.licenseExpiry ? new Date(driver.licenseExpiry).toLocaleDateString() : '-'}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-500 hover:text-zinc-900" onClick={() => handleEdit(driver)}>
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-700 hover:bg-red-50" onClick={() => handleDelete(driver.id)}>
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
