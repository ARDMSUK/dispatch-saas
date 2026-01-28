
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Search, ArrowRightLeft, Trash2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

export default function FixedPricesTab() {
    const [prices, setPrices] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const [formData, setFormData] = useState({
        name: "",
        pickup: "",
        dropoff: "",
        price: "" as any,
        vehicleType: "Saloon",
        isReverse: true
    });

    const fetchPrices = async () => {
        try {
            const url = searchTerm ? `/api/pricing/fixed?q=${searchTerm}` : "/api/pricing/fixed";
            const res = await fetch(url);
            const data = await res.json();
            setPrices(data);
        } catch (error) {
            console.error("Failed to fetch fixed prices", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPrices();
    }, [searchTerm]);

    const handleCreate = async () => {
        try {
            const payload = {
                ...formData,
                price: parseFloat(formData.price)
            };
            const res = await fetch("/api/pricing/fixed", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                setIsDialogOpen(false);
                setFormData({ name: "", pickup: "", dropoff: "", price: "", vehicleType: "Saloon", isReverse: true });
                fetchPrices();
            } else {
                alert("Failed to create fixed price");
            }
        } catch (error) {
            console.error("Error creating fixed price", error);
        }
    };

    return (
        <div className="mt-4 flex flex-col gap-4">
            <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm border">
                <div className="relative w-72">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-zinc-400" />
                    <Input
                        placeholder="Search routes..."
                        className="pl-8"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-zinc-800">
                            <Plus className="mr-2 h-4 w-4" /> Add Fixed Price
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Add Fixed Price Route</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <Input
                                placeholder="Route Name (e.g. Heathrow T5)"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                            />
                            <div className="grid grid-cols-2 gap-4">
                                <Input
                                    placeholder="Pickup (e.g. OX1)"
                                    value={formData.pickup}
                                    onChange={e => setFormData({ ...formData, pickup: e.target.value })}
                                />
                                <Input
                                    placeholder="Dropoff (e.g. Heathrow)"
                                    value={formData.dropoff}
                                    onChange={e => setFormData({ ...formData, dropoff: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <Input
                                    type="number"
                                    placeholder="Price (£)"
                                    value={formData.price}
                                    onChange={e => setFormData({ ...formData, price: e.target.value })}
                                />
                                <Input
                                    placeholder="Vehicle (Saloon, MPV...)"
                                    value={formData.vehicleType}
                                    onChange={e => setFormData({ ...formData, vehicleType: e.target.value })}
                                />
                            </div>
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="reverse"
                                    checked={formData.isReverse}
                                    onCheckedChange={(checked: boolean) => setFormData({ ...formData, isReverse: checked })}
                                />
                                <label
                                    htmlFor="reverse"
                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                >
                                    Apply logic in reverse direction too?
                                </label>
                            </div>
                            <Button onClick={handleCreate} className="w-full bg-zinc-800">Create Route</Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
                <Table>
                    <TableHeader className="bg-zinc-50">
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Route</TableHead>
                            <TableHead>Price</TableHead>
                            <TableHead>Vehicle</TableHead>
                            <TableHead>Reverse?</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow><TableCell colSpan={5} className="text-center py-6">Loading...</TableCell></TableRow>
                        ) : prices.length === 0 ? (
                            <TableRow><TableCell colSpan={5} className="text-center py-6 text-zinc-400">No fixed prices found</TableCell></TableRow>
                        ) : (
                            prices.map((fp) => (
                                <TableRow key={fp.id}>
                                    <TableCell className="font-medium">{fp.name}</TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2 text-sm">
                                            <span className="font-mono bg-zinc-100 px-1 rounded">{fp.pickup}</span>
                                            <ArrowRightLeft className="h-3 w-3 text-zinc-400" />
                                            <span className="font-mono bg-zinc-100 px-1 rounded">{fp.dropoff}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="font-bold text-green-600">£{fp.price.toFixed(2)}</TableCell>
                                    <TableCell>{fp.vehicleType}</TableCell>
                                    <TableCell>{fp.isReverse ? 'Yes' : 'No'}</TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
