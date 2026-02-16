
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Car, Check, Info } from 'lucide-react';
import { BookingData } from './booking-wizard';

type Props = {
    data: BookingData;
    onUpdate: (data: Partial<BookingData>) => void;
    onNext: () => void;
};

// Mock Vehicle Data (In real app, fetch from pricing rules or vehicles)
const VEHICLES = [
    { id: 'Saloon', name: 'Saloon', seats: 4, bags: 2, image: '/vehicles/saloon.png', desc: 'Standard sedan for everyday travel.' },
    { id: 'Estate', name: 'Estate', seats: 4, bags: 4, image: '/vehicles/estate.png', desc: 'Extra luggage space for airport runs.' },
    { id: 'Executive', name: 'Executive', seats: 3, bags: 2, image: '/vehicles/executive.png', desc: 'Mercedes E-Class or similar.' },
    { id: 'MPV', name: 'MPV 6', seats: 6, bags: 4, image: '/vehicles/mpv.png', desc: 'Spacious travel for groups.' },
    { id: 'Minibus', name: 'Minibus 8', seats: 8, bags: 8, image: '/vehicles/minibus.png', desc: 'Large groups and events.' },
];

export function StepVehicle({ data, onUpdate, onNext }: Props) {
    const [prices, setPrices] = useState<Record<string, number>>({});
    const [loading, setLoading] = useState(false);

    // Fetch Prices for All Vehicles
    useEffect(() => {
        if (!data.pickup || !data.dropoff) return;

        const fetchPrices = async () => {
            setLoading(true);
            const formatting: Record<string, number> = {};

            // We fetch sequentially or parallel? Parallel is faster.
            // But realistically we just hit the pricing endpoint once if it supported bulk, 
            // or we iterate. The current endpoint is single.
            // For MVP UI responsiveness, we'll iterate locally.

            const promises = VEHICLES.map(async (v) => {
                try {
                    const res = await fetch('/api/pricing/calculate', {
                        method: 'POST',
                        body: JSON.stringify({
                            pickup: data.pickup,
                            dropoff: data.dropoff,
                            pickupLat: data.pickupCoords?.lat,
                            pickupLng: data.pickupCoords?.lng,
                            dropoffLat: data.dropoffCoords?.lat,
                            dropoffLng: data.dropoffCoords?.lng,
                            vias: data.vias,
                            vehicleType: v.id,
                            date: data.date.toISOString(),
                            waitingTime: 0, // Not showing wait cost here yet
                            isWaitAndReturn: false // Basic price first
                        })
                    });
                    const resData = await res.json();
                    if (resData.price) {
                        formatting[v.id] = resData.price;
                    }
                } catch (e) { console.error(e); }
            });

            await Promise.all(promises);
            setPrices(formatting);
            setLoading(false);

            // Auto update distance if available from one of the responses
            // Not implemented in this hook, but could be.
        };

        fetchPrices();
    }, [data.pickup, data.dropoff, data.pickupCoords, data.dropoffCoords]);

    const handleSelect = (vId: string) => {
        onUpdate({
            vehicleType: vId,
            price: prices[vId] || null
        });
        // We defer 'next' to let them see the selection, or call onNext immediately?
        // Let's call onNext immediately for smoother flow? 
        // No, user might want to read description.
    };

    return (
        <div className="space-y-6 h-full flex flex-col">
            <h2 className="text-xl font-bold text-white mb-2">Choose your vehicle</h2>

            <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
                {VEHICLES.map((v) => {
                    const price = prices[v.id];
                    const isSelected = data.vehicleType === v.id;

                    return (
                        <div
                            key={v.id}
                            onClick={() => handleSelect(v.id)}
                            className={`relative p-4 rounded-xl border transition-all cursor-pointer flex items-center gap-4 ${isSelected ? 'bg-amber-500/10 border-amber-500' : 'bg-black/40 border-white/10 hover:bg-white/5'}`}
                        >
                            {/* Icon / Image Placeholder */}
                            <div className={`h-12 w-16 rounded-lg flex items-center justify-center ${isSelected ? 'bg-amber-500 text-black' : 'bg-white/10 text-zinc-400'}`}>
                                <Car className="h-6 w-6" />
                            </div>

                            <div className="flex-1">
                                <div className="flex justify-between items-center mb-1">
                                    <h3 className={`font-bold ${isSelected ? 'text-amber-500' : 'text-white'}`}>{v.name}</h3>
                                    {loading ? (
                                        <div className="h-4 w-12 bg-white/10 animate-pulse rounded"></div>
                                    ) : price ? (
                                        <span className={`font-mono font-bold text-lg ${isSelected ? 'text-white' : 'text-emerald-400'}`}>£{price.toFixed(2)}</span>
                                    ) : (
                                        <span className="text-xs text-zinc-500">Calc...</span>
                                    )}
                                </div>
                                <div className="flex items-center gap-3 text-xs text-zinc-400">
                                    <span className="flex items-center gap-1"><span className="font-bold">{v.seats}</span> Pax</span>
                                    <span className="flex items-center gap-1"><span className="font-bold">{v.bags}</span> Bags</span>
                                </div>
                            </div>

                            {isSelected && (
                                <div className="absolute top-1/2 right-4 -translate-y-1/2">
                                    {/* Checkmark or similar could go here */}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            <Button
                onClick={onNext}
                className="w-full h-14 text-lg font-bold bg-amber-500 hover:bg-amber-400 text-black rounded-xl"
            >
                Confirm {data.vehicleType}
            </Button>
        </div>
    );
}
