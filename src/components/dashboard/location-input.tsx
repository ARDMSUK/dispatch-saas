/* eslint-disable */
"use client";

import { useEffect, useState, useRef } from "react";
import { Check, Loader2, MapPin, Plane } from "lucide-react";
import { toast } from "sonner";
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";

interface LocationInputProps {
    value?: string;
    onChange?: (value: string) => void;
    onLocationSelect: (location: { address: string; lat: number; lng: number }) => void;
    placeholder?: string;
    className?: string;
    disabled?: boolean;
}

export function LocationInput({
    value = "",
    onChange,
    onLocationSelect,
    placeholder = "Search location...",
    className,
    disabled
}: LocationInputProps) {
    const [open, setOpen] = useState(false);
    const [inputValue, setInputValue] = useState(value);
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

    const [customSuggestions, setCustomSuggestions] = useState<{ id: string, label: string, address: string }[]>([]);
    const [frequentLocations, setFrequentLocations] = useState<{ address: string, count: number }[]>([]);

    // Fetch frequent locations
    useEffect(() => {
        const fetchFrequent = async () => {
            try {
                const res = await fetch('/api/locations/stats');
                if (res.ok) {
                    const data = await res.json();
                    if (Array.isArray(data)) {
                        setFrequentLocations(data);
                    }
                }
            } catch (e) {
                console.error("Failed to load frequent locations", e);
            }
        }
        fetchFrequent();
    }, []);

    // Sync input value with external value prop changes
    useEffect(() => {
        if (value !== inputValue) {
            setInputValue(value);
        }
    }, [value]);

    // Handle typing and trigger autocomplete API fetch (debounced)
    useEffect(() => {
        // Quick custom suggestions for airports (Heathrow, Gatwick, Luton, Stansted)
        const input = inputValue.toLowerCase().trim();
        const matches = [];

        // Heathrow Terminal numbers (t1, t2, t3, t4, t5)
        if (input.match(/^t[1-5]$/)) {
            const term = input.replace('t', '');
            matches.push({
                id: `lhr-t${term}`,
                label: `Heathrow Terminal ${term}`,
                address: `Heathrow Terminal ${term}, Longford, Hounslow, UK`
            });
        }

        // Heathrow general
        if (input.includes('heathrow') || input.includes('lhr') || input.includes('ter')) {
            if (!input.includes('2') && !input.includes('3') && !input.includes('4') && !input.includes('5')) {
                matches.push(
                    { id: 'lhr-t2', label: 'Heathrow Terminal 2', address: 'Heathrow Terminal 2, Longford, Hounslow, UK' },
                    { id: 'lhr-t3', label: 'Heathrow Terminal 3', address: 'Heathrow Terminal 3, Longford, Hounslow, UK' },
                    { id: 'lhr-t4', label: 'Heathrow Terminal 4', address: 'Heathrow Terminal 4, Longford, Hounslow, UK' },
                    { id: 'lhr-t5', label: 'Heathrow Terminal 5', address: 'Heathrow Terminal 5, Longford, Hounslow, UK' },
                );
            }
        }

        // Gatwick (South & North Terminals)
        if (input.includes('gatwick') || input.includes('lgw') || input.includes('gat')) {
            const hasNorth = input.includes('n') || input.includes('nor');
            const hasSouth = input.includes('s') || input.includes('sou');

            if (!hasNorth && !hasSouth) {
                matches.push(
                    { id: 'lgw-south', label: 'Gatwick Airport South Terminal', address: 'Gatwick Airport South Terminal, Horley, Gatwick, RH6 0NP' },
                    { id: 'lgw-north', label: 'Gatwick Airport North Terminal', address: 'Gatwick Airport North Terminal, Horley, Gatwick, RH6 0JP' }
                );
            } else {
                if (hasSouth) {
                    matches.push({ id: 'lgw-south', label: 'Gatwick Airport South Terminal', address: 'Gatwick Airport South Terminal, Horley, Gatwick, RH6 0NP' });
                }
                if (hasNorth) {
                    matches.push({ id: 'lgw-north', label: 'Gatwick Airport North Terminal', address: 'Gatwick Airport North Terminal, Horley, Gatwick, RH6 0JP' });
                }
            }
        }

        // Luton Airport
        if (input.includes('luton') || input.includes('ltn') || input.includes('lut')) {
            matches.push({ id: 'ltn-airport', label: 'Luton Airport', address: 'Luton Airport, Airport Way, Luton, LU2 9LY' });
        }

        // Stansted Airport
        if (input.includes('stansted') || input.includes('stn') || input.includes('std') || input.includes('stan')) {
            matches.push({ id: 'stn-airport', label: 'Stansted Airport', address: 'Stansted Airport, Bassingbourn Road, Stansted, CM24 1QW' });
        }

        setCustomSuggestions(matches.slice(0, 4));

        // Fetch general suggestions from API
        if (inputValue.length < 3) {
            setSuggestions([]);
            return;
        }

        if (searchTimeout.current) {
            clearTimeout(searchTimeout.current);
        }

        searchTimeout.current = setTimeout(async () => {
            setLoading(true);
            try {
                const res = await fetch(`/api/external/autocomplete?q=${encodeURIComponent(inputValue)}`);
                if (res.ok) {
                    const data = await res.json();
                    if (data && Array.isArray(data.results)) {
                        setSuggestions(data.results);
                    }
                }
            } catch (e) {
                console.error("Autocomplete lookup failed", e);
            } finally {
                setLoading(false);
            }
        }, 300);

        return () => {
            if (searchTimeout.current) {
                clearTimeout(searchTimeout.current);
            }
        };
    }, [inputValue]);

    // Direct helper to geocode selected address (e.g. from frequent or custom lists)
    const geocodeAddressText = async (address: string): Promise<{ lat: number, lng: number } | null> => {
        try {
            const res = await fetch(`/api/external/autocomplete?q=${encodeURIComponent(address)}`);
            if (res.ok) {
                const data = await res.json();
                if (data && Array.isArray(data.results) && data.results.length > 0) {
                    const match = data.results[0];
                    return {
                        lat: parseFloat(String(match.lat)),
                        lng: parseFloat(String(match.lng))
                    };
                }
            }
        } catch (e) {
            console.error("Address resolution failed", e);
        }
        return null;
    }

    const handleSelect = (item: any) => {
        setInputValue(item.value);
        setSuggestions([]);
        setOpen(false);

        const lat = parseFloat(String(item.lat));
        const lng = parseFloat(String(item.lng));

        onLocationSelect({ address: item.value, lat, lng });
        if (onChange) onChange(item.value);
    };

    const handleCustomSelect = async (item: { label: string, address: string }) => {
        setInputValue(item.address);
        setSuggestions([]);
        setOpen(false);
        setLoading(true);

        const coords = await geocodeAddressText(item.address);
        setLoading(false);

        if (coords) {
            onLocationSelect({ address: item.address, lat: coords.lat, lng: coords.lng });
            if (onChange) onChange(item.address);
        } else {
            toast.error("Could not geocode Heathrow Terminal, check network.");
            if (onChange) onChange(item.address);
        }
    };

    const handleFrequentSelect = async (addr: string) => {
        setInputValue(addr);
        setSuggestions([]);
        setOpen(false);
        setLoading(true);

        const coords = await geocodeAddressText(addr);
        setLoading(false);

        if (coords) {
            onLocationSelect({ address: addr, lat: coords.lat, lng: coords.lng });
            if (onChange) onChange(addr);
        } else {
            toast.error("Could not geocode address, check network.");
            if (onChange) onChange(addr);
        }
    };

    const filteredFrequent = inputValue.length < 2
        ? frequentLocations
        : frequentLocations.filter(L => L.address.toLowerCase().includes(inputValue.toLowerCase()));

    return (
        <div className="relative w-full">
            <div className="relative flex items-center w-full">
                <input
                    type="text"
                    autoComplete="off"
                    value={inputValue}
                    onChange={(e) => {
                        const val = e.target.value;
                        setInputValue(val);
                        if (onChange) onChange(val);
                        setOpen(true);
                    }}
                    onFocus={() => { setOpen(true); }}
                    onBlur={() => setTimeout(() => setOpen(false), 200)}
                    placeholder={placeholder}
                    disabled={disabled}
                    className={cn(className, "pr-10")}
                />
                {loading && (
                    <Loader2 className="absolute right-3 h-4 w-4 animate-spin text-slate-400" />
                )}
            </div>
            
            {open && (suggestions.length > 0 || filteredFrequent.length > 0 || customSuggestions.length > 0) && (
                <div className="absolute top-[calc(100%+4px)] left-0 w-full z-[10000] bg-slate-100 dark:bg-[#1e1e24] border border-slate-200 dark:border-white/10 shadow-2xl rounded-md overflow-hidden">
                    <Command shouldFilter={false} className="bg-slate-100 dark:bg-[#1e1e24] w-full max-h-80 overflow-y-auto overflow-x-hidden">
                        <CommandList>
                            {/* FREQUENT LOCATIONS */}
                            {filteredFrequent.length > 0 && (
                                <CommandGroup heading="Most Used" className="text-emerald-500 dark:text-emerald-400">
                                    {filteredFrequent.map((item, i) => {
                                        const parts = item.address.split(",");
                                        const mainText = parts[0].trim();
                                        const secondaryText = parts.length > 1 ? parts.slice(1).join(",").trim() : "";
                                        return (
                                        <CommandItem
                                            key={`freq-${i}`}
                                            value={item.address}
                                            onSelect={() => handleFrequentSelect(item.address)}
                                            className="data-[selected=true]:bg-zinc-800 data-[selected=true]:text-white dark:data-[selected=true]:bg-white/10 cursor-pointer p-2 text-slate-900 dark:text-slate-200 bg-emerald-500/10 hover:bg-emerald-500/20 dark:hover:bg-emerald-500/30 mb-1 rounded-sm border border-emerald-500/20 flex items-start"
                                        >
                                            <MapPin className="mr-2 mt-0.5 h-4 w-4 text-emerald-500 dark:text-emerald-400 shrink-0" />
                                            <div className="flex flex-col overflow-hidden w-full pr-2">
                                                <span className="font-medium">{mainText}</span>
                                                {secondaryText && <span className="text-xs text-slate-500 dark:text-slate-400">{secondaryText}</span>}
                                            </div>
                                            <span className="ml-auto text-[10px] text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-white/5 px-1 rounded shrink-0 mt-0.5">{item.count}</span>
                                        </CommandItem>
                                    )})}
                                </CommandGroup>
                            )}

                            {/* CUSTOM SHORTCUTS */}
                            {customSuggestions.length > 0 && (
                                <CommandGroup heading="Quick Matches" className="text-indigo-600 dark:text-blue-400">
                                    {customSuggestions.map((item) => (
                                        <CommandItem
                                            key={item.id}
                                            value={item.label}
                                            onSelect={() => handleCustomSelect(item)}
                                            className="data-[selected=true]:bg-zinc-800 data-[selected=true]:text-white dark:data-[selected=true]:bg-white/10 cursor-pointer p-2 text-slate-900 dark:text-slate-200 bg-indigo-600/10 hover:bg-indigo-600/20 dark:hover:bg-blue-500/20 mb-1 rounded-sm border border-indigo-600/20 dark:border-blue-500/30"
                                        >
                                            <Plane className="mr-2 h-4 w-4 text-indigo-600 dark:text-blue-400" />
                                            <span className="font-bold">{item.label}</span>
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                            )}

                            {/* SUGGESTED LOCATIONS */}
                            {suggestions.length > 0 && (
                                <CommandGroup heading="Suggested Locations" className="dark:text-slate-400">
                                    {suggestions.map((item, i) => {
                                        const parts = item.label.split(",");
                                        const mainText = parts[0].trim();
                                        const secondaryText = parts.length > 1 ? parts.slice(1).join(",").trim() : "";
                                        return (
                                        <CommandItem
                                            key={`sugg-${i}`}
                                            value={item.label}
                                            onSelect={() => handleSelect(item)}
                                            className="data-[selected=true]:bg-zinc-800 dark:data-[selected=true]:bg-white/10 data-[selected=true]:text-white dark:data-[selected=true]:text-white cursor-pointer p-2 text-slate-900 dark:text-slate-200 flex items-start"
                                        >
                                            <MapPin className="mr-2 mt-0.5 h-4 w-4 opacity-50 dark:opacity-70 shrink-0" />
                                            <div className="flex flex-col overflow-hidden w-full pr-2">
                                                <span className="font-medium">{mainText}</span>
                                                {secondaryText && <span className="text-xs text-slate-500 dark:text-slate-400">{secondaryText}</span>}
                                            </div>
                                            {value === item.label && <Check className="ml-auto h-4 w-4 opacity-50 shrink-0 mt-0.5" />}
                                        </CommandItem>
                                    )})}
                                </CommandGroup>
                            )}
                        </CommandList>
                    </Command>
                </div>
            )}
        </div>
    );
}
