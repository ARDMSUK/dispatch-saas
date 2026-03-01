"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Car, MapPin, CalendarClock, Plus, Users, Navigation } from "lucide-react";
import { format } from "date-fns";
import { Job } from "@/lib/types";

export default function B2BBookings() {
    const [bookings, setBookings] = useState<Job[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    // New Booking Form State
    const [formData, setFormData] = useState({
        passengerName: "",
        passengerPhone: "",
        pickupAddress: "",
        dropoffAddress: "",
        pickupDate: "",
        pickupTime: "",
        passengers: 1,
        notes: ""
    });

    const fetchBookings = async () => {
        try {
            const res = await fetch("/api/b2b/bookings");
            if (res.ok) {
                const data = await res.json();
                setBookings(data);
            }
        } catch (error) {
            console.error("Failed to fetch B2B bookings", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBookings();
    }, []);

    const handleCreateBooking = async () => {
        try {
            // Construct ISO DateTime
            const dateTimeStr = `${formData.pickupDate}T${formData.pickupTime}:00Z`;

            const payload = {
                passengerName: formData.passengerName,
                passengerPhone: formData.passengerPhone,
                pickupAddress: formData.pickupAddress,
                dropoffAddress: formData.dropoffAddress,
                pickupTime: dateTimeStr,
                passengers: formData.passengers,
                notes: formData.notes
            };

            const res = await fetch("/api/b2b/bookings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                setIsDialogOpen(false);
                setFormData({
                    passengerName: "",
                    passengerPhone: "",
                    pickupAddress: "",
                    dropoffAddress: "",
                    pickupDate: "",
                    pickupTime: "",
                    passengers: 1,
                    notes: ""
                });
                fetchBookings();
            } else {
                const err = await res.json();
                alert(`Error: ${err.message || err.error}`);
            }
        } catch (error) {
            console.error("Failed to create booking", error);
            alert("Failed to submit corporate booking.");
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case "PENDING":
            case "UNASSIGNED": return "bg-zinc-500/20 text-zinc-400 border-zinc-500/50";
            case "DISPATCHED": return "bg-blue-500/20 text-blue-400 border-blue-500/50";
            case "EN_ROUTE": return "bg-purple-500/20 text-purple-400 border-purple-500/50";
            case "ARRIVED": return "bg-orange-500/20 text-orange-400 border-orange-500/50";
            case "POB": return "bg-emerald-500/20 text-emerald-400 border-emerald-500/50";
            default: return "bg-zinc-800 text-zinc-300 border-zinc-700";
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-zinc-100">Active Bookings</h1>
                    <p className="text-zinc-500 mt-1">Manage and track your upcoming corporate travel.</p>
                </div>

                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium shadow-lg shadow-indigo-500/20 transition-all">
                            <Plus className="w-4 h-4 mr-2" /> New Booking
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px]">
                        <DialogHeader>
                            <DialogTitle>Schedule Corporate Travel</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-zinc-400">Staff Member Name</label>
                                    <Input
                                        placeholder="Name"
                                        value={formData.passengerName}
                                        onChange={e => setFormData({ ...formData, passengerName: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-zinc-400">Mobile Phone</label>
                                    <Input
                                        placeholder="+44..."
                                        value={formData.passengerPhone}
                                        onChange={e => setFormData({ ...formData, passengerPhone: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-medium text-zinc-400">Pickup Address</label>
                                <Input
                                    placeholder="Company HQ or Hotel"
                                    value={formData.pickupAddress}
                                    onChange={e => setFormData({ ...formData, pickupAddress: e.target.value })}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-zinc-400">Destination</label>
                                <Input
                                    placeholder="Airport, Station, Office"
                                    value={formData.dropoffAddress}
                                    onChange={e => setFormData({ ...formData, dropoffAddress: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-[1fr_1fr_80px] gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-zinc-400">Date</label>
                                    <Input
                                        type="date"
                                        value={formData.pickupDate}
                                        onChange={e => setFormData({ ...formData, pickupDate: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-zinc-400">Time (UTC)</label>
                                    <Input
                                        type="time"
                                        value={formData.pickupTime}
                                        onChange={e => setFormData({ ...formData, pickupTime: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-zinc-400">Pax</label>
                                    <Input
                                        type="number"
                                        min="1"
                                        max="8"
                                        value={formData.passengers}
                                        onChange={e => setFormData({ ...formData, passengers: parseInt(e.target.value) || 1 })}
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-medium text-zinc-400">Instructions / Cost Center</label>
                                <Input
                                    placeholder="e.g. Project Alpha, CC:10492"
                                    value={formData.notes}
                                    onChange={e => setFormData({ ...formData, notes: e.target.value })}
                                />
                            </div>

                            <Button onClick={handleCreateBooking} className="w-full mt-2 bg-indigo-600 hover:bg-indigo-500">
                                Confirm Setup
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            {loading ? (
                <div className="w-full flex justify-center py-20">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
                </div>
            ) : bookings.length === 0 ? (
                <Card className="bg-zinc-900/40 border-zinc-800/80 backdrop-blur-sm">
                    <CardContent className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="w-16 h-16 bg-zinc-800/50 rounded-full flex items-center justify-center mb-4">
                            <Car className="w-8 h-8 text-zinc-600" />
                        </div>
                        <h3 className="text-xl font-medium text-zinc-300">No active bookings</h3>
                        <p className="text-zinc-500 mt-2 max-w-sm">You don't have any upcoming trips scheduled. Click "New Booking" to arrange travel.</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {bookings.map(job => (
                        <Card key={job.id} className="bg-zinc-900/60 border-zinc-800/80 backdrop-blur-sm overflow-hidden flex flex-col hover:border-zinc-700 transition-colors">
                            <div className="px-4 py-3 border-b border-zinc-800 flex justify-between items-center bg-zinc-950/30">
                                <Badge variant="outline" className={`font-mono ${getStatusColor(job.status)}`}>
                                    {job.status}
                                </Badge>
                                <span className="text-xs font-mono text-zinc-500">REF: {job.id}</span>
                            </div>
                            <CardContent className="p-5 flex-1 flex flex-col gap-4">
                                <div className="flex items-start gap-3">
                                    <div className="mt-1 bg-zinc-800 p-2 rounded-md">
                                        <CalendarClock className="w-4 h-4 text-indigo-400" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-sm font-semibold text-zinc-200">
                                            {format(new Date(job.pickupTime), 'E, MMM do yyyy')}
                                        </span>
                                        <span className="text-2xl font-bold text-white tracking-tight">
                                            {format(new Date(job.pickupTime), 'HH:mm')}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-3 relative pt-2">
                                    <div className="absolute left-3 top-5 bottom-4 w-px bg-zinc-800 -z-10"></div>

                                    <div className="flex items-start gap-3">
                                        <div className="w-6 h-6 rounded-full bg-zinc-900 border border-zinc-700 flex items-center justify-center z-10 shrink-0">
                                            <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
                                        </div>
                                        <div className="flex flex-col justify-start pt-0.5">
                                            <span className="text-sm text-zinc-300 font-medium leading-tight">{job.pickupAddress}</span>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3">
                                        <div className="w-6 h-6 rounded-full bg-zinc-900 border border-zinc-700 flex items-center justify-center z-10 shrink-0">
                                            <MapPin className="w-3 h-3 text-red-400" />
                                        </div>
                                        <div className="flex flex-col justify-start pt-0.5">
                                            <span className="text-sm text-zinc-400 leading-tight">{job.dropoffAddress}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-auto pt-4 border-t border-zinc-800/80 flex justify-between items-center">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold mb-0.5">Passenger</span>
                                        <span className="text-sm font-medium text-zinc-300">{job.passengerName}</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <Badge variant="secondary" className="bg-zinc-800 text-zinc-400 border-zinc-700 hover:bg-zinc-800">
                                            <Users className="w-3 h-3 mr-1" /> {job.passengers}
                                        </Badge>
                                        <Badge variant="secondary" className="bg-zinc-800 text-zinc-400 border-zinc-700 font-mono hover:bg-zinc-800">
                                            {job.vehicleType}
                                        </Badge>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
