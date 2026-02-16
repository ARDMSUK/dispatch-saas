
'use client';

import { useState, useEffect } from 'react';
import { LocationInput } from '@/components/dashboard/location-input'; // Reuse existing
import { Button } from '@/components/ui/button';
import { MapPin, Navigation, Calendar, Clock, RotateCw } from 'lucide-react';
import { BookingData } from './booking-wizard';

type Props = {
    data: BookingData;
    onUpdate: (data: Partial<BookingData>) => void;
    onNext: () => void;
};

export function StepLocation({ data, onUpdate, onNext }: Props) {
    // Local state for formatted date string to input
    const [dateStr, setDateStr] = useState(data.date.toISOString().slice(0, 16));

    useEffect(() => {
        onUpdate({ date: new Date(dateStr) });
    }, [dateStr]);

    const isValid = data.pickup.length > 3 && data.dropoff.length > 3;

    return (
        <div className="space-y-6 h-full flex flex-col">
            <h2 className="text-xl font-bold text-white mb-2">Where to?</h2>

            <div className="space-y-4 flex-1">
                {/* Pickup */}
                <div className="relative group z-30">
                    <div className="absolute left-3 top-4 text-emerald-500">
                        <Navigation className="h-5 w-5" />
                    </div>
                    <LocationInput
                        placeholder="Pickup Location"
                        className="w-full bg-black/40 border border-white/10 rounded-xl py-4 pl-12 pr-4 text-white focus:outline-none focus:border-amber-500/50 transition-all"
                        value={data.pickup}
                        onChange={(val) => onUpdate({ pickup: val, pickupCoords: null })}
                        onLocationSelect={(loc) => onUpdate({ pickup: loc.address, pickupCoords: { lat: loc.lat, lng: loc.lng } })}
                    />
                </div>

                {/* Dropoff */}
                <div className="relative group z-20">
                    <div className="absolute left-3 top-4 text-amber-500">
                        <MapPin className="h-5 w-5" />
                    </div>
                    <LocationInput
                        placeholder="Dropoff Destination"
                        className="w-full bg-black/40 border border-white/10 rounded-xl py-4 pl-12 pr-4 text-white focus:outline-none focus:border-amber-500/50 transition-all"
                        value={data.dropoff}
                        onChange={(val) => onUpdate({ dropoff: val, dropoffCoords: null })}
                        onLocationSelect={(loc) => onUpdate({ dropoff: loc.address, dropoffCoords: { lat: loc.lat, lng: loc.lng } })}
                    />
                </div>

                {/* Date & Time */}
                <div className="grid grid-cols-1 gap-4 pt-4 border-t border-white/5">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                            <Calendar className="h-3 w-3" /> Pickup Time
                        </label>
                        <input
                            type="datetime-local"
                            className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-amber-500/50 [color-scheme:dark]"
                            value={dateStr}
                            onChange={(e) => setDateStr(e.target.value)}
                        />
                    </div>
                </div>

                {/* Return Toggle */}
                <div className="flex items-center gap-3 p-4 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 transition-colors cursor-pointer" onClick={() => onUpdate({ isReturn: !data.isReturn })}>
                    <div className={`h-5 w-5 rounded border flex items-center justify-center ${data.isReturn ? 'bg-amber-500 border-amber-500 text-black' : 'border-zinc-600'}`}>
                        {data.isReturn && <RotateCw className="h-3 w-3" />}
                    </div>
                    <span className="text-sm font-medium text-white select-none">Add Return Journey</span>
                </div>

                {data.isReturn && (
                    <div className="pl-4 border-l-2 border-amber-500/20 animate-in slide-in-from-top-2">
                        <p className="text-xs text-zinc-500 mb-2">Return Details (Swapped Route)</p>
                        <input
                            type="datetime-local"
                            className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-amber-500/50 [color-scheme:dark]"
                            // Default return date logic could be here
                            onChange={(e) => onUpdate({ returnDate: new Date(e.target.value) })}
                        />
                    </div>
                )}
            </div>

            <Button
                onClick={onNext}
                disabled={!isValid}
                className="w-full h-14 text-lg font-bold bg-amber-500 hover:bg-amber-400 text-black rounded-xl"
            >
                Next Step
            </Button>
        </div>
    );
}
