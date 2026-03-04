"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Search, ArrowRightLeft, Trash2, ArrowLeftRight } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FixedPrice } from "@/lib/types";

export default function FixedPricesTab() {
    const [prices, setPrices] = useState<FixedPrice[]>([]);
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
            toast.error("Failed to load fixed prices");
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
                toast.success("Fixed price created");
                fetchPrices();
            } else {
                toast.error("Failed to create fixed price");
            }
        } catch (error) {
            console.error("Error creating fixed price", error);
            toast.error("Error creating fixed price");
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this price?")) return;
        try {
            const res = await fetch(`/api/pricing/fixed/${id}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                toast.success("Fixed price deleted");
                fetchPrices();
            } else {
                toast.error("Failed to delete price");
            }
        } catch (error) {
            console.error(error);
            toast.error("Error deleting price");
        }
    };

    return (
        <div className="mt-4 flex flex-col gap-4">
            <div className="flex justify-between items-center bg-slate-100 p-4 rounded-lg shadow-sm border border-slate-200">
                <div className="relative w-72">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
                    <Input
                        placeholder="Search routes..."
                        className="pl-8 bg-white border-slate-200 text-slate-900 placeholder:text-zinc-600"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-blue-700 text-black hover:bg-blue-800">
                            <Plus className="mr-2 h-4 w-4" /> Add Fixed Price
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-slate-100 border-slate-200 text-slate-900">
                        <DialogHeader>
                            <DialogTitle>Add Fixed Price Route</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <Input
                                placeholder="Route Name (e.g. Heathrow T5)"
                                className="bg-white border-slate-200 text-slate-900 placeholder:text-zinc-600"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                            />
                            <div className="grid grid-cols-2 gap-4">
                                <Input
                                    placeholder="Pickup (e.g. OX1)"
                                    className="bg-white border-slate-200 text-slate-900 placeholder:text-zinc-600"
                                    value={formData.pickup}
                                    onChange={e => setFormData({ ...formData, pickup: e.target.value })}
                                />
                                <Input
                                    placeholder="Dropoff (e.g. Heathrow)"
                                    className="bg-white border-slate-200 text-slate-900 placeholder:text-zinc-600"
                                    value={formData.dropoff}
                                    onChange={e => setFormData({ ...formData, dropoff: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <Input
                                    type="number"
                                    placeholder="Price (£)"
                                    className="bg-white border-slate-200 text-slate-900 placeholder:text-zinc-600"
                                    value={formData.price}
                                    onChange={e => setFormData({ ...formData, price: e.target.value })}
                                />
                                <Select value={formData.vehicleType} onValueChange={(val) => setFormData({ ...formData, vehicleType: val })}>
                                    <SelectTrigger className="bg-white border-slate-200 text-slate-900">
                                        <SelectValue placeholder="Vehicle" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-slate-100 border-slate-200 text-slate-900">
                                        <SelectItem value="Saloon">Saloon</SelectItem>
                                        <SelectItem value="Estate">Estate</SelectItem>
                                        <SelectItem value="Executive">Executive</SelectItem>
                                        <SelectItem value="MPV">MPV</SelectItem>
                                        <SelectItem value="Minibus">Minibus</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="reverse"
                                    checked={formData.isReverse}
                                    onCheckedChange={(checked: boolean) => setFormData({ ...formData, isReverse: checked })}
                                    className="border-white/20 data-[state=checked]:bg-blue-700 data-[state=checked]:text-black"
                                />
                                <label
                                    htmlFor="reverse"
                                    className="text-sm font-medium leading-none text-slate-500 peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                >
                                    Apply logic in reverse direction too?
                                </label>
                            </div>
                            <Button onClick={handleCreate} className="w-full bg-blue-700 text-black hover:bg-blue-800">Create Route</Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="bg-slate-100 rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                <Table>
                    <TableHeader className="bg-white">
                        <TableRow className="hover:bg-zinc-900/50 border-slate-200">
                            <TableHead className="text-slate-500">Name</TableHead>
                            <TableHead className="text-slate-500">Route</TableHead>
                            <TableHead className="text-slate-500">Price</TableHead>
                            <TableHead className="text-slate-500">Vehicle</TableHead>
                            <TableHead className="text-slate-500">Reverse?</TableHead>
                            <TableHead className="text-slate-500 w-[50px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow><TableCell colSpan={6} className="text-center py-6 text-slate-400">Loading...</TableCell></TableRow>
                        ) : prices.length === 0 ? (
                            <TableRow><TableCell colSpan={6} className="text-center py-6 text-slate-400">No fixed prices found</TableCell></TableRow>
                        ) : (
                            prices.map((fp) => (
                                <TableRow key={fp.id} className="border-slate-200 hover:bg-slate-200/50">
                                    <TableCell className="font-medium text-slate-900">{fp.name}</TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2 text-sm text-slate-600">
                                            <span className="font-mono bg-white px-1 rounded border border-slate-200">{fp.pickup}</span>
                                            <ArrowLeftRight className="h-3 w-3 text-slate-400" />
                                            <span className="font-mono bg-white px-1 rounded border border-slate-200">{fp.dropoff}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="font-bold text-emerald-600">£{fp.price.toFixed(2)}</TableCell>
                                    <TableCell className="text-slate-500">{fp.vehicleType}</TableCell>
                                    <TableCell className="text-slate-500">{fp.isReverse ? 'Yes' : 'No'}</TableCell>
                                    <TableCell>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-400 hover:bg-red-950/20" onClick={() => handleDelete(fp.id)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
