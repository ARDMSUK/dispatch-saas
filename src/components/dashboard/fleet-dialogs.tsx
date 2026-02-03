'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';

export function AddDriverDialog({ onDriverAdded }: { onDriverAdded: () => void }) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);

        const formData = new FormData(e.currentTarget);
        const data = {
            name: formData.get('name'),
            callsign: formData.get('callsign'),
            phone: formData.get('phone'),
            email: formData.get('email'),
        };

        try {
            const res = await fetch('/api/drivers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });

            if (!res.ok) throw new Error('Failed to create driver');

            toast.success('Driver added successfully');
            setOpen(false);
            onDriverAdded();
        } catch (error) {
            toast.error('Failed to add driver');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="icon" variant="ghost" className="h-6 w-6 text-zinc-400 hover:text-white">
                    <Plus className="h-4 w-4" />
                </Button>
            </DialogTrigger>
            <DialogContent className="bg-zinc-900 border-white/10 text-white">
                <DialogHeader>
                    <DialogTitle>Add New Driver</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label>Name</Label>
                        <Input name="name" required placeholder="John Doe" className="bg-zinc-950 border-white/10" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Callsign</Label>
                            <Input name="callsign" required placeholder="101" className="bg-zinc-950 border-white/10" />
                        </div>
                        <div className="space-y-2">
                            <Label>Phone</Label>
                            <Input name="phone" required placeholder="+44..." className="bg-zinc-950 border-white/10" />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label>Email</Label>
                        <Input name="email" type="email" placeholder="driver@example.com" className="bg-zinc-950 border-white/10" />
                    </div>
                    <Button type="submit" className="w-full bg-amber-500 text-black hover:bg-amber-400" disabled={loading}>
                        {loading ? 'Adding...' : 'Add Driver'}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    );
}

export function AddVehicleDialog({ onVehicleAdded }: { onVehicleAdded: () => void }) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);

        const formData = new FormData(e.currentTarget);
        const data = {
            reg: formData.get('reg'),
            model: formData.get('model'),
            type: formData.get('type'),
            color: formData.get('color'),
        };

        try {
            const res = await fetch('/api/vehicles', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });

            if (!res.ok) throw new Error('Failed to create vehicle');

            toast.success('Vehicle added successfully');
            setOpen(false);
            onVehicleAdded();
        } catch (error) {
            toast.error('Failed to add vehicle');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="icon" variant="ghost" className="h-6 w-6 text-zinc-400 hover:text-white">
                    <Plus className="h-4 w-4" />
                </Button>
            </DialogTrigger>
            <DialogContent className="bg-zinc-900 border-white/10 text-white">
                <DialogHeader>
                    <DialogTitle>Add New Vehicle</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Registration</Label>
                            <Input name="reg" required placeholder="LOND 0N1" className="bg-zinc-950 border-white/10" />
                        </div>
                        <div className="space-y-2">
                            <Label>Type</Label>
                            <Select name="type" defaultValue="Saloon">
                                <SelectTrigger className="bg-zinc-950 border-white/10">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-zinc-900 border-white/10 text-white">
                                    <SelectItem value="Saloon">Saloon</SelectItem>
                                    <SelectItem value="Estate">Estate</SelectItem>
                                    <SelectItem value="MPV">MPV</SelectItem>
                                    <SelectItem value="Exec">Exec</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label>Model</Label>
                        <Input name="model" required placeholder="Mercedes E-Class" className="bg-zinc-950 border-white/10" />
                    </div>
                    <div className="space-y-2">
                        <Label>Color</Label>
                        <Input name="color" placeholder="Black" className="bg-zinc-950 border-white/10" />
                    </div>
                    <Button type="submit" className="w-full bg-amber-500 text-black hover:bg-amber-400" disabled={loading}>
                        {loading ? 'Adding...' : 'Add Vehicle'}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    );
}
