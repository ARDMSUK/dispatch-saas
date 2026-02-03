'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface DesignateDriverDialogProps {
    job: any;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

export function DesignateDriverDialog({ job, open, onOpenChange, onSuccess }: DesignateDriverDialogProps) {
    const [drivers, setDrivers] = useState<any[]>([]);
    const [selectedDriverId, setSelectedDriverId] = useState<string>('none');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (open) {
            fetchDrivers();
            setSelectedDriverId(job?.preAssignedDriver?.id || 'none');
        }
    }, [open, job]);

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
                preAssignedDriverId: selectedDriverId === 'none' ? null : selectedDriverId
            };

            const res = await fetch(`/api/jobs/${job.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) throw new Error("Failed to update designation");

            toast.success("Driver designation updated");
            onSuccess();
            onOpenChange(false);
        } catch (error) {
            console.error(error);
            toast.error("Failed to update designation");
        } finally {
            setLoading(false);
        }
    };

    if (!job) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="bg-zinc-950 border border-white/10 text-white sm:max-w-[400px]">
                <DialogHeader>
                    <DialogTitle>Designate Driver (Auto-Dispatch)</DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    <div className="flex flex-col space-y-2">
                        <div className="text-xs text-zinc-400">Job Reference</div>
                        <div className="text-sm font-mono bg-white/5 p-2 rounded">
                            #{job.id} - {new Date(job.pickupTime).toLocaleString()}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-zinc-300">Select Driver</label>
                        <select
                            className="w-full bg-black/40 border border-white/10 rounded-md py-2.5 px-3 text-sm text-white focus:outline-none focus:border-amber-400/50 appearance-none"
                            value={selectedDriverId}
                            onChange={e => setSelectedDriverId(e.target.value)}
                        >
                            <option value="none">-- No Designation (Auto-Assign Disabled) --</option>
                            {drivers.map((d: any) => (
                                <option key={d.id} value={d.id}>
                                    {d.callsign} - {d.name} ({d.status})
                                </option>
                            ))}
                        </select>
                        <p className="text-[10px] text-zinc-500">
                            The job will be automatically dispatched to this driver 30 minutes before pickup.
                        </p>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-zinc-400 hover:text-white">
                        Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={loading} className="bg-amber-500 hover:bg-amber-600 text-black">
                        {loading ? 'Saving...' : 'Save Designation'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
