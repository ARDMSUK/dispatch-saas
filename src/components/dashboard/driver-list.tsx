/* eslint-disable */
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Car, Phone, Navigation } from 'lucide-react';

type Driver = {
    id: string;
    name: string;
    callsign: string;
    status: string; // FREE, BUSY, AWAY, OFF_DUTY
    location?: { lat: number; lng: number };
    vehicle?: { type: string; reg: string };
};

type DriverListProps = {
    onAssign: (driverId: string) => void;
    selectedJobId?: number | null;
};

export function DriverList({ onAssign, selectedJobId }: DriverListProps) {
    const [drivers, setDrivers] = useState<Driver[]>([]);

    // Mock data for now if API isn't ready, but let's try to fetch
    const fetchDrivers = async () => {
        try {
            // TODO: Create/Verify /api/drivers endpoint
            // For now, let's mock if it fails or returns empty, for the demo UI
            /*
            const res = await fetch('/api/drivers?status=FREE');
            const data = await res.json();
            setDrivers(data);
            */
            // Using logic to simulate fetch
            const res = await fetch('/api/drivers');
            if (res.ok) {
                const data = await res.json();
                setDrivers(data);
            }
        } catch (e) {
            console.error("Failed to fetch drivers", e);
        }
    };

    useEffect(() => {
        fetchDrivers();
        // Poll regularly
        const interval = setInterval(fetchDrivers, 15000);
        return () => clearInterval(interval);
    }, []);

    // Helper for status colors
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'FREE': return 'bg-emerald-500';
            case 'BUSY': return 'bg-red-500';
            case 'AWAY': return 'bg-amber-500';
            default: return 'bg-zinc-500';
        }
    };

    return (
        <Card className="h-full bg-zinc-900 border-zinc-800 flex flex-col">
            <CardHeader className="pb-3 border-b border-white/5">
                <CardTitle className="text-white text-lg">Drivers</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-zinc-700">
                {drivers.map(driver => (
                    <div key={driver.id} className="bg-black/20 rounded-lg p-3 border border-white/5 flex flex-col gap-2">
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <div className={`h-2 w-2 rounded-full ${getStatusColor(driver.status)} shadow-[0_0_8px_currentColor]`} />
                                <span className="font-bold text-white text-sm">{driver.callsign}</span>
                                <span className="text-xs text-zinc-500">{driver.name.split(' ')[0]}</span>
                            </div>
                            <Badge variant="secondary" className="bg-white/5 text-xs">
                                {driver.vehicle?.type || 'Vehicle'}
                            </Badge>
                        </div>

                        <div className="flex items-center justify-between text-xs text-zinc-400">
                            <div className="flex items-center gap-1">
                                <Car className="h-3 w-3" />
                                <span>{driver.vehicle?.reg || 'No Reg'}</span>
                            </div>
                            {driver.location && (
                                <div className="flex items-center gap-1 text-emerald-500/80">
                                    <Navigation className="h-3 w-3" />
                                    <span>LinesHQ</span>
                                </div>
                            )}
                        </div>

                        {selectedJobId && driver.status === 'FREE' && (
                            <Button
                                size="sm"
                                className="w-full bg-amber-500 hover:bg-amber-400 text-black font-bold h-7 text-xs mt-1"
                                onClick={() => onAssign(driver.id)}
                            >
                                Assign Job #{selectedJobId}
                            </Button>
                        )}
                    </div>
                ))}
            </CardContent>
        </Card>
    );
}
