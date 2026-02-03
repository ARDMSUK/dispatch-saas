"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Clock, CalendarDays, Trash2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export default function SurchargesTab() {
    const [surcharges, setSurcharges] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const [formData, setFormData] = useState({
        name: "",
        type: "PERCENT",
        value: "",
        startDate: "",
        endDate: "",
        startTime: "",
        endTime: "",
        daysOfWeek: ""
    });

    const fetchSurcharges = async () => {
        try {
            const res = await fetch("/api/pricing/surcharges");
            const data = await res.json();
            setSurcharges(data);
        } catch (error) {
            console.error("Failed to fetch surcharges", error);
            toast.error("Failed to load surcharges");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSurcharges();
    }, []);

    const handleCreate = async () => {
        try {
            const payload: any = {
                ...formData,
                value: parseFloat(formData.value)
            };

            // Clean up empty strings
            if (!payload.startDate) delete payload.startDate;
            if (!payload.endDate) delete payload.endDate;
            else {
                // Ensure ISO string if present
                payload.startDate = new Date(payload.startDate).toISOString();
                payload.endDate = new Date(payload.endDate).toISOString();
            }

            if (!payload.startTime) delete payload.startTime;
            if (!payload.endTime) delete payload.endTime;
            if (!payload.daysOfWeek) delete payload.daysOfWeek;

            const res = await fetch("/api/pricing/surcharges", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                setIsDialogOpen(false);
                setFormData({ name: "", type: "PERCENT", value: "", startDate: "", endDate: "", startTime: "", endTime: "", daysOfWeek: "" });
                toast.success("Surcharge created");
                fetchSurcharges();
            } else {
                const err = await res.json();
                toast.error("Failed to create surcharge");
                console.error(err);
            }
        } catch (error) {
            console.error("Error creating surcharge", error);
            toast.error("Error creating surcharge");
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this surcharge rule?")) return;
        try {
            const res = await fetch(`/api/pricing/surcharges/${id}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                toast.success("Surcharge deleted");
                fetchSurcharges();
            } else {
                toast.error("Failed to delete surcharge");
            }
        } catch (error) {
            console.error(error);
            toast.error("Error deleting surcharge");
        }
    };

    return (
        <div className="mt-4 flex flex-col gap-4">
            <div className="flex justify-end bg-zinc-900 p-4 rounded-lg shadow-sm border border-white/10">
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-amber-500 text-black hover:bg-amber-600">
                            <Plus className="mr-2 h-4 w-4" /> Add Surcharge
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-zinc-900 border-white/10 text-white">
                        <DialogHeader>
                            <DialogTitle>Add Surcharge Rule</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <Input
                                placeholder="Name (e.g. Christmas Day)"
                                className="bg-zinc-950 border-white/10 text-white placeholder:text-zinc-600"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                            />
                            <div className="grid grid-cols-2 gap-4">
                                <Select value={formData.type} onValueChange={(val) => setFormData({ ...formData, type: val })}>
                                    <SelectTrigger className="bg-zinc-950 border-white/10 text-white">
                                        <SelectValue placeholder="Type" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-zinc-900 border-white/10 text-white">
                                        <SelectItem value="PERCENT">Percentage (%)</SelectItem>
                                        <SelectItem value="FLAT">Flat Amount (£)</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Input
                                    type="number"
                                    placeholder="Value (e.g. 50)"
                                    className="bg-zinc-950 border-white/10 text-white placeholder:text-zinc-600"
                                    value={formData.value}
                                    onChange={e => setFormData({ ...formData, value: e.target.value })}
                                />
                            </div>

                            <div className="space-y-2 border-t border-white/10 pt-2">
                                <label className="text-sm font-medium text-zinc-400">Time Range (Daily)</label>
                                <div className="grid grid-cols-2 gap-4">
                                    <Input
                                        type="time"
                                        className="bg-zinc-950 border-white/10 text-white"
                                        value={formData.startTime}
                                        onChange={e => setFormData({ ...formData, startTime: e.target.value })}
                                    />
                                    <Input
                                        type="time"
                                        className="bg-zinc-950 border-white/10 text-white"
                                        value={formData.endTime}
                                        onChange={e => setFormData({ ...formData, endTime: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2 border-t border-white/10 pt-2">
                                <label className="text-sm font-medium text-zinc-400">Date Range (Optional)</label>
                                <div className="grid grid-cols-2 gap-4">
                                    <Input
                                        type="date"
                                        className="bg-zinc-950 border-white/10 text-white"
                                        value={formData.startDate}
                                        onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                                    />
                                    <Input
                                        type="date"
                                        className="bg-zinc-950 border-white/10 text-white"
                                        value={formData.endDate}
                                        onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                                    />
                                </div>
                            </div>

                            <Input
                                placeholder="Days (comma sep: 0=Sun, 6=Sat)"
                                className="bg-zinc-950 border-white/10 text-white placeholder:text-zinc-600"
                                value={formData.daysOfWeek}
                                onChange={e => setFormData({ ...formData, daysOfWeek: e.target.value })}
                            />

                            <Button onClick={handleCreate} className="w-full bg-amber-500 text-black hover:bg-amber-600">Create Surcharge</Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="bg-zinc-900 rounded-lg shadow-sm border border-white/10 overflow-hidden">
                <Table>
                    <TableHeader className="bg-zinc-950">
                        <TableRow className="hover:bg-zinc-900/50 border-white/5">
                            <TableHead className="text-zinc-400">Name</TableHead>
                            <TableHead className="text-zinc-400">Value</TableHead>
                            <TableHead className="text-zinc-400">Type</TableHead>
                            <TableHead className="text-zinc-400">Triggers</TableHead>
                            <TableHead className="text-zinc-400 w-[50px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow><TableCell colSpan={5} className="text-center py-6 text-zinc-500">Loading...</TableCell></TableRow>
                        ) : surcharges.length === 0 ? (
                            <TableRow><TableCell colSpan={5} className="text-center py-6 text-zinc-500">No surcharges found</TableCell></TableRow>
                        ) : (
                            surcharges.map((s) => (
                                <TableRow key={s.id} className="border-white/5 hover:bg-zinc-800/50">
                                    <TableCell className="font-medium text-white">{s.name}</TableCell>
                                    <TableCell className="font-bold text-amber-500">
                                        {s.type === 'PERCENT' ? `+${s.value}%` : `+£${s.value.toFixed(2)}`}
                                    </TableCell>
                                    <TableCell><Badge variant="outline" className="border-white/20 text-zinc-300">{s.type}</Badge></TableCell>
                                    <TableCell>
                                        <div className="flex flex-col gap-1 text-xs text-zinc-400">
                                            {(s.startTime || s.endTime) && (
                                                <div className="flex items-center gap-1"><Clock className="h-3 w-3" /> {s.startTime} - {s.endTime}</div>
                                            )}
                                            {(s.startDate || s.endDate) && (
                                                <div className="flex items-center gap-1"><CalendarDays className="h-3 w-3" />
                                                    {new Date(s.startDate).toLocaleDateString()} - {new Date(s.endDate).toLocaleDateString()}
                                                </div>
                                            )}
                                            {s.daysOfWeek && (
                                                <div>Days: {s.daysOfWeek}</div>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-500 hover:text-red-400 hover:bg-red-950/20" onClick={() => handleDelete(s.id)}>
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
