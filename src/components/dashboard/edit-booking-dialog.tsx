'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Navigation, MapPin, User, Zap, Plane, Check } from 'lucide-react';
import { LocationInput } from '@/components/dashboard/location-input';
import { toast } from 'sonner';

interface EditBookingDialogProps {
    job: any;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onJobUpdated: () => void;
}

export function EditBookingDialog({ job, open, onOpenChange, onJobUpdated }: EditBookingDialogProps) {
    const [pickup, setPickup] = useState('');
    const [dropoff, setDropoff] = useState('');
    const [passengerName, setPassengerName] = useState('');
    const [passengerPhone, setPassengerPhone] = useState('');
    const [pickupTime, setPickupTime] = useState('');
    const [vehicleType, setVehicleType] = useState('Saloon');
    const [fare, setFare] = useState<string>('0');
    const [notes, setNotes] = useState('');
    const [preAssignedDriverId, setPreAssignedDriverId] = useState<string>('');
    const [drivers, setDrivers] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (open) {
            fetchDrivers();
        }
        if (job && open) {
            setPickup(job.pickupAddress || '');
            setDropoff(job.dropoffAddress || '');
            setPassengerName(job.passengerName || '');
            setPassengerPhone(job.passengerPhone || '');
            setPickupTime(job.pickupTime ? new Date(job.pickupTime).toISOString().slice(0, 16) : '');
            setVehicleType(job.vehicleType || 'Saloon');
            setFare(job.fare?.toString() || '0');
            setNotes(job.notes || '');
            setPreAssignedDriverId(job.preAssignedDriver?.id || 'none');
        }
    }, [job, open]);

    const fetchDrivers = async () => {
        try {
            const res = await fetch('/api/drivers');
            if (res.ok) {
                const data = await res.json();
                setDrivers(data);
            }
        } catch (error) {
            console.error("Failed to load drivers");
        }
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            const payload: any = {
                pickupAddress: pickup,
                dropoffAddress: dropoff,
                passengerName,
                passengerPhone,
                pickupTime: new Date(pickupTime).toISOString(),
                vehicleType,
                fare: parseFloat(fare),
                notes
            };

            if (preAssignedDriverId && preAssignedDriverId !== 'none') {
                payload.preAssignedDriverId = preAssignedDriverId;
            } else {
                payload.preAssignedDriverId = null; // Clear it if 'none'
            }

            const res = await fetch(`/api/jobs/${job.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) throw new Error("Failed to update job");

            toast.success("Booking updated successfully");
            onJobUpdated();
            onOpenChange(false);
        } catch (error) {
            console.error(error);
            toast.error("Failed to update booking");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="bg-zinc-950 border-white/10 text-white sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="text-amber-500 uppercase tracking-widest text-sm font-bold">Edit Booking #{job?.id}</DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
                    {/* Route */}
                    <div className="space-y-3">
                        <label className="text-xs font-bold text-zinc-500 uppercase">Journey</label>
                        <div className="relative">
                            <div className="absolute left-3 top-3 text-emerald-500"><Navigation className="h-4 w-4" /></div>
                            <input
                                className="w-full bg-black/40 border border-white/10 rounded-md py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-amber-400/50"
                                value={pickup}
                                onChange={e => setPickup(e.target.value)}
                                placeholder="Pickup"
                            />
                        </div>
                        <div className="relative">
                            <div className="absolute left-3 top-3 text-amber-500"><MapPin className="h-4 w-4" /></div>
                            <input
                                className="w-full bg-black/40 border border-white/10 rounded-md py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-amber-400/50"
                                value={dropoff}
                                onChange={e => setDropoff(e.target.value)}
                                placeholder="Dropoff"
                            />
                        </div>
                    </div>

                    {/* Passenger */}
                    <div className="space-y-3">
                        <label className="text-xs font-bold text-zinc-500 uppercase">Passenger</label>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="relative">
                                <div className="absolute left-3 top-3 text-zinc-500"><User className="h-4 w-4" /></div>
                                <input
                                    className="w-full bg-black/40 border border-white/10 rounded-md py-2.5 pl-10 pr-2 text-sm text-white focus:outline-none focus:border-amber-400/50"
                                    value={passengerName}
                                    onChange={e => setPassengerName(e.target.value)}
                                    placeholder="Name"
                                />
                            </div>
                            <div className="relative">
                                <div className="absolute left-3 top-3 text-zinc-500"><Zap className="h-4 w-4" /></div>
                                <input
                                    className="w-full bg-black/40 border border-white/10 rounded-md py-2.5 pl-10 pr-2 text-sm text-white focus:outline-none focus:border-amber-400/50"
                                    value={passengerPhone}
                                    onChange={e => setPassengerPhone(e.target.value)}
                                    placeholder="Phone"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Details */}
                    <div className="space-y-3">
                        <label className="text-xs font-bold text-zinc-500 uppercase">Details</label>
                        <div className="grid grid-cols-2 gap-3">
                            <input
                                type="datetime-local"
                                className="w-full bg-black/40 border border-white/10 rounded-md py-2.5 px-3 text-sm text-white focus:outline-none focus:border-amber-400/50 [color-scheme:dark]"
                                value={pickupTime}
                                onChange={e => setPickupTime(e.target.value)}
                            />
                            <select
                                className="w-full bg-black/40 border border-white/10 rounded-md py-2.5 px-3 text-sm text-white focus:outline-none focus:border-amber-400/50 appearance-none"
                                value={vehicleType}
                                onChange={e => setVehicleType(e.target.value)}
                            >
                                <option value="Saloon">Saloon</option>
                                <option value="Estate">Estate</option>
                                <option value="Executive">Executive</option>
                                <option value="MPV">MPV 6</option>
                                <option value="MPV8">MPV 8</option>
                                <option value="Minibus">Minibus</option>
                            </select>
                        </div>
                        <div className="relative">
                            <span className="absolute left-3 top-2.5 text-zinc-500 text-sm">£</span>
                            <input
                                type="number"
                                step="0.01"
                                className="w-full bg-black/40 border border-white/10 rounded-md py-2.5 pl-8 pr-4 text-sm text-white focus:outline-none focus:border-amber-400/50"
                                value={fare}
                                onChange={e => setFare(e.target.value)}
                                placeholder="Fare"
                            />
                        </div>
                        <textarea
                            className="w-full bg-black/40 border border-white/10 rounded-md py-2.5 px-3 text-sm text-white focus:outline-none focus:border-amber-400/50 min-h-[80px]"
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            placeholder="Driver Notes..."
                        />

                        {/* Designated Driver */}
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-zinc-500 uppercase">Designated Driver (Auto-Dispatch)</label>
                            <select
                                className="w-full bg-black/40 border border-white/10 rounded-md py-2.5 px-3 text-sm text-white focus:outline-none focus:border-amber-400/50 appearance-none"
                                value={preAssignedDriverId}
                                onChange={e => setPreAssignedDriverId(e.target.value)}
                            >
                                <option value="none">-- No Designation --</option>
                                {drivers.map((d: any) => (
                                    <option key={d.id} value={d.id}>
                                        {d.callsign} - {d.name} ({d.status})
                                    </option>
                                ))}
                            </select>
                            <p className="text-[10px] text-zinc-500">
                                This driver will be automatically assigned when the job is within 30 minutes of pickup.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                    <Button variant="ghost" onClick={() => onOpenChange(false)} className="hover:bg-white/5 text-zinc-400">Cancel</Button>
                    <Button onClick={handleSave} disabled={loading} className="bg-amber-500 hover:bg-amber-400 text-black font-bold">
                        {loading ? 'Saving...' : 'Save Changes'}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
