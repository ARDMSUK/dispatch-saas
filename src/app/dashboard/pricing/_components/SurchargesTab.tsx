
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Clock, CalendarDays } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

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

            // Clean up empty strings to undefined/null for API validation
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
                fetchSurcharges();
            } else {
                const err = await res.json();
                alert("Failed to create surcharge: " + (err.message || JSON.stringify(err.error)));
            }
        } catch (error) {
            console.error("Error creating surcharge", error);
        }
    };

    return (
        <div className="mt-4 flex flex-col gap-4">
            <div className="flex justify-end">
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-zinc-800">
                            <Plus className="mr-2 h-4 w-4" /> Add Surcharge
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Add Surcharge Rule</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <Input
                                placeholder="Name (e.g. Christmas Day)"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                            />
                            <div className="grid grid-cols-2 gap-4">
                                <Select value={formData.type} onValueChange={(val) => setFormData({ ...formData, type: val })}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="PERCENT">Percentage (%)</SelectItem>
                                        <SelectItem value="FLAT">Flat Amount (£)</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Input
                                    type="number"
                                    placeholder="Value (e.g. 50)"
                                    value={formData.value}
                                    onChange={e => setFormData({ ...formData, value: e.target.value })}
                                />
                            </div>

                            <div className="space-y-2 border-t pt-2">
                                <label className="text-sm font-medium">Time Range (Daily)</label>
                                <div className="grid grid-cols-2 gap-4">
                                    <Input
                                        type="time"
                                        value={formData.startTime}
                                        onChange={e => setFormData({ ...formData, startTime: e.target.value })}
                                    />
                                    <Input
                                        type="time"
                                        value={formData.endTime}
                                        onChange={e => setFormData({ ...formData, endTime: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2 border-t pt-2">
                                <label className="text-sm font-medium">Date Range (Optional)</label>
                                <div className="grid grid-cols-2 gap-4">
                                    <Input
                                        type="date"
                                        value={formData.startDate}
                                        onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                                    />
                                    <Input
                                        type="date"
                                        value={formData.endDate}
                                        onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                                    />
                                </div>
                            </div>

                            <Input
                                placeholder="Days (comma sep: 0=Sun, 6=Sat)"
                                value={formData.daysOfWeek}
                                onChange={e => setFormData({ ...formData, daysOfWeek: e.target.value })}
                            />

                            <Button onClick={handleCreate} className="w-full bg-zinc-800">Create Surcharge</Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
                <Table>
                    <TableHeader className="bg-zinc-50">
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Value</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Triggers</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow><TableCell colSpan={4} className="text-center py-6">Loading...</TableCell></TableRow>
                        ) : surcharges.length === 0 ? (
                            <TableRow><TableCell colSpan={4} className="text-center py-6 text-zinc-400">No surcharges found</TableCell></TableRow>
                        ) : (
                            surcharges.map((s) => (
                                <TableRow key={s.id}>
                                    <TableCell className="font-medium">{s.name}</TableCell>
                                    <TableCell className="font-bold text-orange-600">
                                        {s.type === 'PERCENT' ? `+${s.value}%` : `+£${s.value.toFixed(2)}`}
                                    </TableCell>
                                    <TableCell><Badge variant="outline">{s.type}</Badge></TableCell>
                                    <TableCell>
                                        <div className="flex flex-col gap-1 text-xs text-zinc-500">
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
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
