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

export default function VehiclesPage() {
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
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
        expiryDate: ""
    });

    const fetchVehicles = async () => {
        try {
            const res = await fetch("/api/vehicles");
            if (!res.ok) throw new Error("Failed to fetch vehicles");

            const data = await res.json();
            if (Array.isArray(data)) {
                setVehicles(data);
            } else {
                console.error("Invalid vehicles data:", data);
                setVehicles([]);
            }
        } catch (error) {
            console.error("Failed to fetch vehicles", error);
            setVehicles([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchVehicles();
    }, []);

    const resetForm = () => {
        setFormData({ reg: "", make: "", model: "", type: "Saloon", color: "", expiryDate: "" });
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

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                setIsDialogOpen(false);
                resetForm();
                fetchVehicles();
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
            expiryDate: vehicle.expiryDate || ""
        });
        setIsDialogOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this vehicle?")) return;

        try {
            const res = await fetch(`/api/vehicles/${id}`, { method: "DELETE" });
            if (res.ok) {
                fetchVehicles();
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

    return (
        <div className="h-full flex flex-col p-4 bg-zinc-50 gap-4">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-zinc-800">Vehicle Management</h1>
                <Dialog open={isDialogOpen} onOpenChange={handleOpenChange}>
                    <DialogTrigger asChild>
                        <Button className="bg-zinc-800 hover:bg-zinc-700">
                            <Plus className="mr-2 h-4 w-4" /> Add Vehicle
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{editingId ? 'Edit Vehicle' : 'Add New Vehicle'}</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <Input
                                placeholder="Registration (License Plate)"
                                value={formData.reg}
                                onChange={e => setFormData({ ...formData, reg: e.target.value })}
                            />
                            <div className="grid grid-cols-2 gap-4">
                                <Input
                                    placeholder="Make (e.g. Toyota)"
                                    value={formData.make}
                                    onChange={e => setFormData({ ...formData, make: e.target.value })}
                                />
                                <Input
                                    placeholder="Model (e.g. Prius)"
                                    value={formData.model}
                                    onChange={e => setFormData({ ...formData, model: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <Input
                                    placeholder="Color"
                                    value={formData.color}
                                    onChange={e => setFormData({ ...formData, color: e.target.value })}
                                />
                                <Input
                                    placeholder="Type (Saloon, MPV...)"
                                    value={formData.type}
                                    onChange={e => setFormData({ ...formData, type: e.target.value })}
                                />
                            </div>
                            <div className="space-y-1">
                                <Input
                                    type="date"
                                    placeholder="MOT/License Expiry"
                                    value={formData.expiryDate ? formData.expiryDate.split('T')[0] : ''}
                                    onChange={e => setFormData({ ...formData, expiryDate: new Date(e.target.value).toISOString() })}
                                />
                                <span className="text-[10px] text-zinc-500 ml-1">MOT/License Expiry</span>
                            </div>
                            <Button onClick={handleSave} className="w-full bg-zinc-800">
                                {editingId ? 'Update Vehicle' : 'Create Vehicle'}
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="flex gap-2 mb-4">
                <div className="relative flex-1">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-zinc-400" />
                    <Input
                        placeholder="Search vehicles..."
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
                                <TableHead className="w-[100px]">Registration</TableHead>
                                <TableHead>Make/Model</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Color</TableHead>
                                <TableHead>Expiry</TableHead>
                                <TableHead>Driver</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-8">Loading vehicles...</TableCell>
                                </TableRow>
                            ) : filteredVehicles.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-8 text-zinc-400">No vehicles found</TableCell>
                                </TableRow>
                            ) : (
                                filteredVehicles.map((vehicle) => (
                                    <TableRow key={vehicle.id} className="hover:bg-zinc-50 group">
                                        <TableCell className="font-bold font-mono text-lg">{vehicle.reg}</TableCell>
                                        <TableCell className="font-medium">{vehicle.make} {vehicle.model}</TableCell>
                                        <TableCell><Badge variant="outline">{vehicle.type}</Badge></TableCell>
                                        <TableCell>{vehicle.color}</TableCell>
                                        <TableCell className="text-xs">
                                            {vehicle.expiryDate ? new Date(vehicle.expiryDate).toLocaleDateString() : '-'}
                                        </TableCell>
                                        <TableCell className="text-sm">
                                            {/* @ts-expect-error: Driver relation might be missing in Type for now */}
                                            {vehicle.driver?.callsign || '-'}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-500 hover:text-zinc-900" onClick={() => handleEdit(vehicle)}>
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-700 hover:bg-red-50" onClick={() => handleDelete(vehicle.id)}>
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
