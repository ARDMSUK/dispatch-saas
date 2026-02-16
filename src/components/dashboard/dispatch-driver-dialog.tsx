'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface DispatchDriverDialogProps {
    job: any;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

export function DispatchDriverDialog({ job, open, onOpenChange, onSuccess }: DispatchDriverDialogProps) {
    const [drivers, setDrivers] = useState<any[]>([]);
    const [selectedDriverId, setSelectedDriverId] = useState<string>('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (open) {
            fetchDrivers();
            setSelectedDriverId('');
        }
    }, [open]);

    const fetchDrivers = async () => {
        try {
            const res = await fetch('/api/drivers');
            if (res.ok) {
                const data = await res.json();
                // Filter for ONLINE drivers ideally, but showing all for now with status indicator
                setDrivers(data);
            }
        } catch (error) {
            console.error("Failed to load drivers");
        }
    };

    const handleDispatch = async () => {
        if (!selectedDriverId) {
            toast.error("Please select a driver");
            return;
        }

        setLoading(true);
        try {
            const res = await fetch(`/api/jobs/${job.id}/assign`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ driverId: selectedDriverId })
            });

            if (!res.ok) throw new Error("Failed to dispatch");

            toast.success("Job Dispatched successfully");
            onSuccess();
            onOpenChange(false);
        } catch (error) {
            console.error(error);
            toast.error("Failed to dispatch job");
        } finally {
            setLoading(false);
        }
    };

    if (!job) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="bg-zinc-950 border border-white/10 text-white sm:max-w-[400px]">
                <DialogHeader>
                    <DialogTitle>Dispatch Driver Now</DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    <div className="flex flex-col space-y-2">
                        <div className="text-xs text-zinc-400">Job Reference</div>
                        <div className="text-sm font-mono bg-white/5 p-2 rounded">
                            #{job.id} - {job.pickupAddress}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-zinc-300">Select Available Driver</label>
                        <select
                            className="w-full bg-black/40 border border-white/10 rounded-md py-2.5 px-3 text-sm text-white focus:outline-none focus:border-emerald-400/50 appearance-none"
                            value={selectedDriverId}
                            onChange={e => setSelectedDriverId(e.target.value)}
                        >
                            <option value="">-- Select Driver --</option>
                            {drivers.map((d: any) => (
                                <option key={d.id} value={d.id}>
                                    {d.status === 'ONLINE' ? '🟢' : d.status === 'BUSY' ? '🟠' : '🔴'} {d.callsign} - {d.name} ({d.status})
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-zinc-400 hover:text-white">
                        Cancel
                    </Button>
                    <Button onClick={handleDispatch} disabled={loading || !selectedDriverId} className="bg-emerald-500 hover:bg-emerald-600 text-black font-bold">
                        {loading ? 'Dispatching...' : 'DISPATCH JOB'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
