"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Vehicle } from "@/lib/types";
import { Plus, Search, Car, Pencil, Trash2 } from "lucide-react";
import { useSession } from "next-auth/react";

export default function VehiclesPage() {
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [drivers, setDrivers] = useState<any[]>([]); // simplified type for now
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    // Form State
    const [formData, setFormData] = useState({
        reg: "",
        make: "",
        model: "",
        type: "Saloon",
        color: "",
        expiryDate: "",
        driverId: "unassigned" // "unassigned" or UUID
    });

    const fetchData = async () => {
        try {
            const [vehiclesRes, driversRes] = await Promise.all([
                fetch("/api/vehicles"),
                fetch("/api/drivers")
            ]);

            if (vehiclesRes.ok) {
                const data = await vehiclesRes.json();
                setVehicles(Array.isArray(data) ? data : []);
            }

            if (driversRes.ok) {
                const data = await driversRes.json();
                setDrivers(Array.isArray(data) ? data : []);
            }
        } catch (error) {
            console.error("Failed to fetch data", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const resetForm = () => {
        setFormData({
            reg: "",
            make: "",
            model: "",
            type: "Saloon",
            color: "",
            expiryDate: "",
            driverId: "unassigned"
        });
        setEditingId(null);
    };

    const handleOpenChange = (open: boolean) => {
        setIsDialogOpen(open);
        if (!open) resetForm();
    };

    const handleSave = async () => {
        try {
            const url = editingId ? `/api/vehicles/${editingId}` : "/api/vehicles";
            const method = editingId ? "PATCH" : "POST";

            const payload = {
                ...formData,
                driverId: formData.driverId === "unassigned" ? null : formData.driverId
            };

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                setIsDialogOpen(false);
                resetForm();
                fetchData();
            } else {
                const error = await res.json();
                alert(`Failed to ${editingId ? 'update' : 'create'} vehicle: ${error.message || error.error}`);
            }
        } catch (error) {
            console.error("Error saving vehicle", error);
        }
    };

    const handleEdit = (vehicle: Vehicle) => {
        setEditingId(vehicle.id);
        setFormData({
            reg: vehicle.reg,
            make: vehicle.make,
            model: vehicle.model,
            type: vehicle.type,
            color: vehicle.color || "",
            expiryDate: vehicle.expiryDate || "",
            driverId: vehicle.driverId || "unassigned"
        });
        setIsDialogOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this vehicle?")) return;

        try {
            const res = await fetch(`/api/vehicles/${id}`, { method: "DELETE" });
            if (res.ok) {
                fetchData();
            } else {
                alert("Failed to delete vehicle");
            }
        } catch (error) {
            console.error("Error deleting vehicle", error);
        }
    };

    const filteredVehicles = vehicles.filter(v =>
        v.reg.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.make.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getVehicleBadgeStyle = (type: string) => {
        if (type === 'Estate') return 'border-blue-500 text-blue-500';
        if (type === 'Executive') return 'border-emerald-500 text-emerald-500';
        if (type.includes('MPV')) return 'border-purple-500 text-purple-500';
        if (type === 'Minibus' || type === 'Coach') return 'border-amber-500 text-amber-500';
        return 'border-zinc-500 text-zinc-500';
    };

    const { data: session } = useSession();
    const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(session?.user?.role as string);

    return (
        <div className="h-full flex flex-col p-4 bg-zinc-950 gap-4">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-white">Vehicle Management</h1>
                {isAdmin && (
                    <Dialog open={isDialogOpen} onOpenChange={handleOpenChange}>
                        <DialogTrigger asChild>
                            <Button className="bg-white text-black hover:bg-zinc-200">
                                <Plus className="mr-2 h-4 w-4" /> Add Vehicle
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-zinc-900 border-white/10 text-white">
                            <DialogHeader>
                                <DialogTitle className="text-white">{editingId ? 'Edit Vehicle' : 'Add New Vehicle'}</DialogTitle>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <Input
                                    placeholder="Registration (License Plate)"
                                    className="bg-zinc-800 border-white/10 text-white placeholder:text-zinc-500"
                                    value={formData.reg}
                                    onChange={e => setFormData({ ...formData, reg: e.target.value })}
                                />
                                <div className="grid grid-cols-2 gap-4">
                                    <Input
                                        placeholder="Make (e.g. Toyota)"
                                        className="bg-zinc-800 border-white/10 text-white placeholder:text-zinc-500"
                                        value={formData.make}
                                        onChange={e => setFormData({ ...formData, make: e.target.value })}
                                    />
                                    <Input
                                        placeholder="Model (e.g. Prius)"
                                        className="bg-zinc-800 border-white/10 text-white placeholder:text-zinc-500"
                                        value={formData.model}
                                        onChange={e => setFormData({ ...formData, model: e.target.value })}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <Input
                                        placeholder="Color"
                                        className="bg-zinc-800 border-white/10 text-white placeholder:text-zinc-500"
                                        value={formData.color}
                                        onChange={e => setFormData({ ...formData, color: e.target.value })}
                                    />
                                    <select
                                        className="flex h-9 w-full rounded-md border border-white/10 bg-zinc-800 px-3 py-1 text-sm text-white shadow-sm transition-colors focus-visible:outline-none focus:ring-1 focus:ring-zinc-700"
                                        value={formData.type}
                                        onChange={e => setFormData({ ...formData, type: e.target.value })}
                                    >
                                        <option value="Saloon">Saloon</option>
                                        <option value="Estate">Estate</option>
                                        <option value="Executive">Executive</option>
                                        <option value="MPV">MPV</option>
                                        <option value="MPV+">MPV+</option>
                                        <option value="Minibus">Minibus</option>
                                        <option value="Coach">Coach</option>
                                    </select>
                                </div>

                                {/* Driver Assignment */}
                                <div className="space-y-1">
                                    <label className="text-xs text-zinc-500 ml-1">Assigned Driver</label>
                                    <select
                                        className="flex h-9 w-full rounded-md border border-white/10 bg-zinc-800 px-3 py-1 text-sm text-white shadow-sm transition-colors focus-visible:outline-none focus:ring-1 focus:ring-zinc-700"
                                        value={formData.driverId}
                                        onChange={e => setFormData({ ...formData, driverId: e.target.value })}
                                    >
                                        <option value="unassigned">-- Unassigned --</option>
                                        {drivers.map(driver => (
                                            <option key={driver.id} value={driver.id}>
                                                {driver.callsign} - {driver.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-1">
                                    <Input
                                        type="date"
                                        className="bg-zinc-800 border-white/10 text-white placeholder:text-zinc-500 block w-full"
                                        placeholder="MOT/License Expiry"
                                        value={formData.expiryDate ? formData.expiryDate.split('T')[0] : ''}
                                        onChange={e => setFormData({ ...formData, expiryDate: new Date(e.target.value).toISOString() })}
                                    />
                                    <span className="text-[10px] text-zinc-500 ml-1">MOT/License Expiry</span>
                                </div>
                                <Button onClick={handleSave} className="w-full bg-amber-500 text-black hover:bg-amber-600">
                                    {editingId ? 'Update Vehicle' : 'Create Vehicle'}
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                )}
            </div>

            <div className="flex gap-2 mb-4">
                <div className="relative flex-1">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-zinc-500" />
                    <Input
                        placeholder="Search vehicles..."
                        className="pl-8 bg-zinc-900/50 border-white/10 text-white placeholder:text-zinc-500"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <Card className="flex-1 overflow-hidden bg-zinc-900/20 border-white/10">
                <div className="overflow-auto max-h-full">
                    <Table>
                        <TableHeader className="bg-zinc-900/50 sticky top-0">
                            <TableRow className="hover:bg-transparent border-white/5">
                                <TableHead className="w-[100px] text-zinc-400">Registration</TableHead>
                                <TableHead className="text-zinc-400">Make/Model</TableHead>
                                <TableHead className="text-zinc-400">Type</TableHead>
                                <TableHead className="text-zinc-400">Color</TableHead>
                                <TableHead className="text-zinc-400">Expiry</TableHead>
                                <TableHead className="text-zinc-400">Driver</TableHead>
                                {isAdmin && <TableHead className="text-right text-zinc-400">Actions</TableHead>}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow className="hover:bg-transparent border-white/5">
                                    <TableCell colSpan={isAdmin ? 7 : 6} className="text-center py-8 text-zinc-500">Loading vehicles...</TableCell>
                                </TableRow>
                            ) : filteredVehicles.length === 0 ? (
                                <TableRow className="hover:bg-transparent border-white/5">
                                    <TableCell colSpan={isAdmin ? 7 : 6} className="text-center py-8 text-zinc-500">No vehicles found</TableCell>
                                </TableRow>
                            ) : (
                                filteredVehicles.map((vehicle) => (
                                    <TableRow key={vehicle.id} className="hover:bg-white/5 border-white/5 group transition-colors">
                                        <TableCell className="font-bold font-mono text-lg text-zinc-200">{vehicle.reg}</TableCell>
                                        <TableCell className="font-medium text-zinc-300">{vehicle.make} {vehicle.model}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className={getVehicleBadgeStyle(vehicle.type)}>{vehicle.type}</Badge>
                                        </TableCell>
                                        <TableCell className="text-zinc-400">{vehicle.color}</TableCell>
                                        <TableCell className="text-xs text-zinc-500">
                                            {vehicle.expiryDate ? new Date(vehicle.expiryDate).toLocaleDateString() : '-'}
                                        </TableCell>
                                        <TableCell className="text-sm text-zinc-400">
                                            {vehicle.driver?.callsign ? (
                                                <Badge variant="secondary" className="bg-zinc-800 text-zinc-300 border-zinc-700">
                                                    {vehicle.driver.callsign}
                                                </Badge>
                                            ) : <span className="text-zinc-700">-</span>}
                                        </TableCell>
                                        {isAdmin && (
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-white" onClick={() => handleEdit(vehicle)}>
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-500/10" onClick={() => handleDelete(vehicle.id)}>
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
            </Card>
        </div>
    );
}
