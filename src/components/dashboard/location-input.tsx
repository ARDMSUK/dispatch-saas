/* eslint-disable */
"use client";

import { useEffect, useState } from "react";
import usePlacesAutocomplete, {
    getGeocode,
    getLatLng,
} from "use-places-autocomplete";
import { Check, Loader2, MapPin, Plane } from "lucide-react";
import { toast } from "sonner";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Button } from "@/components/ui/button";
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

    const {
        ready,
        value: inputValue,
        suggestions: { status, data },
        setValue,
        clearSuggestions,
        init,
    } = usePlacesAutocomplete({
        requestOptions: {
            componentRestrictions: { country: "gb" },
            locationBias: {
                center: { lat: 51.576, lng: -0.708 },
                radius: 16000 
            }
        },
        debounce: 300,
        initOnMount: false, 
    });

    const [customSuggestions, setCustomSuggestions] = useState<{ id: string, label: string, address: string }[]>([]);
    const [frequentLocations, setFrequentLocations] = useState<{ address: string, count: number }[]>([]);

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

    useEffect(() => {
        const input = inputValue.toLowerCase().trim();
        const matches = [];

        if (input.match(/^t[1-5]$/)) {
            const term = input.replace('t', '');
            matches.push({
                id: `lhr-t${term}`,
                label: `Heathrow Terminal ${term}`,
                address: `Heathrow Terminal ${term}, Longford, Hounslow, UK`
            });
        }

        if (input.includes('heathrow') || input.includes('lhr')) {
            if (!input.includes('2') && !input.includes('3') && !input.includes('4') && !input.includes('5')) {
                matches.push(
                    { id: 'lhr-t2', label: 'Heathrow Terminal 2', address: 'Heathrow Terminal 2, Longford, Hounslow, UK' },
                    { id: 'lhr-t3', label: 'Heathrow Terminal 3', address: 'Heathrow Terminal 3, Longford, Hounslow, UK' },
                    { id: 'lhr-t4', label: 'Heathrow Terminal 4', address: 'Heathrow Terminal 4, Longford, Hounslow, UK' },
                    { id: 'lhr-t5', label: 'Heathrow Terminal 5', address: 'Heathrow Terminal 5, Longford, Hounslow, UK' },
                );
            }
        }

        setCustomSuggestions(matches.slice(0, 4)); 
    }, [inputValue]);

    useEffect(() => {
        if (value !== inputValue) {
            setValue(value, false);
        }
    }, [value, setValue]);

    const [scriptLoaded, setScriptLoaded] = useState(false);
    useEffect(() => {
        if (typeof window !== "undefined" && window.google) {
            setScriptLoaded(true);
            init();
        } else {
            const interval = setInterval(() => {
                if (typeof window !== "undefined" && window.google) {
                    setScriptLoaded(true);
                    init();
                    clearInterval(interval);
                }
            }, 500);
            return () => clearInterval(interval);
        }
    }, [init]);

    const handleSelect = async (address: string) => {
        setValue(address, false);
        clearSuggestions();
        setOpen(false);

        try {
            const results = await getGeocode({ address });
            const { lat, lng } = await getLatLng(results[0]);
            onLocationSelect({ address, lat, lng });
            if (onChange) onChange(address);
        } catch (error) {
            console.error("Error fetching coordinates: ", error);
            toast.error("Could not fetch precise location, using address text.");
            if (onChange) onChange(address);
        }
    };

    const handleCustomSelect = async (item: { label: string, address: string }) => {
        setValue(item.address, false);
        clearSuggestions();
        setOpen(false);
        try {
            const results = await getGeocode({ address: item.address });
            const { lat, lng } = await getLatLng(results[0]);
            onLocationSelect({ address: item.address, lat, lng });
            if (onChange) onChange(item.address);
        } catch (e) {
            console.error("Geocoding failed for shortcut", e);
            toast.error("Locating failed, check network.");
        }
    }

    const handleFrequentSelect = (addr: string) => {
        setValue(addr, false);
        setOpen(false);
        handleSelect(addr);
    }

    if (!scriptLoaded) {
        return (
            <div className="relative w-full">
                <input
                    disabled
                    className={cn(className, "opacity-50 cursor-not-allowed")}
                    placeholder="Loading maps..."
                />
            </div>
        )
    }

    const filteredFrequent = inputValue.length < 2
        ? frequentLocations
        : frequentLocations.filter(L => L.address.toLowerCase().includes(inputValue.toLowerCase()));

    return (
        <div className="relative w-full">
            <input
                type="text"
                autoComplete="off"
                value={inputValue}
                onChange={(e) => {
                    const val = e.target.value;
                    setValue(val);
                    if (onChange) onChange(val);
                    setOpen(true);
                }}
                onFocus={() => { if (ready) setOpen(true); }}
                onBlur={() => setTimeout(() => setOpen(false), 200)}
                placeholder={placeholder}
                disabled={disabled || !ready}
                className={cn(className)}
            />
            
            {open && (
                <div className="absolute top-[calc(100%+4px)] left-0 w-full z-[10000] bg-slate-100 border border-slate-200 shadow-2xl rounded-md overflow-hidden">
                    <Command shouldFilter={false} className="bg-slate-100 w-full max-h-80 overflow-y-auto overflow-x-hidden">
                        <CommandList>
                            {/* FREQUENT LOCATIONS */}
                            {filteredFrequent.length > 0 && (
                                <CommandGroup heading="Most Used" className="text-emerald-500">
                                    {filteredFrequent.map((item, i) => (
                                        <CommandItem
                                            key={`freq-${i}`}
                                            value={item.address}
                                            onSelect={() => handleFrequentSelect(item.address)}
                                            className="cursor-pointer p-2 text-slate-900 bg-emerald-500/10 hover:bg-emerald-500/20 mb-1 rounded-sm border border-emerald-500/20"
                                        >
                                            <MapPin className="mr-2 h-4 w-4 text-emerald-500" />
                                            <span className="font-medium truncate">{item.address}</span>
                                            <span className="ml-auto text-[10px] text-slate-400 bg-slate-100 px-1 rounded">{item.count}</span>
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                            )}

                            {/* CUSTOM SHORTCUTS */}
                            {customSuggestions.length > 0 && (
                                <CommandGroup heading="Quick Matches" className="text-blue-700">
                                    {customSuggestions.map((item) => (
                                        <CommandItem
                                            key={item.id}
                                            value={item.label}
                                            onSelect={() => handleCustomSelect(item)}
                                            className="cursor-pointer p-2 text-slate-900 bg-blue-700/10 hover:bg-blue-700/20 mb-1 rounded-sm border border-blue-700/20"
                                        >
                                            <Plane className="mr-2 h-4 w-4 text-blue-700" />
                                            <span className="font-bold">{item.label}</span>
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                            )}

                            {/* GOOGLE RESULTS */}
                            {status === "OK" && (
                                <CommandGroup heading="Google Locations">
                                    {data.map(({ place_id, description, structured_formatting }) => (
                                        <CommandItem
                                            key={place_id}
                                            value={description}
                                            onSelect={handleSelect}
                                            className="data-[selected=true]:bg-zinc-800 data-[selected=true]:text-blue-700 cursor-pointer p-2 text-slate-900"
                                        >
                                            <MapPin className="mr-2 h-4 w-4 opacity-50" />
                                            <span className="truncate">
                                                <span className="font-medium">{structured_formatting.main_text}</span>
                                                <span className="ml-2 text-xs text-muted-foreground">{structured_formatting.secondary_text}</span>
                                            </span>
                                            {value === description && <Check className="ml-auto h-4 w-4 opacity-50" />}
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                            )}

                            {status !== "OK" && inputValue.length > 0 && customSuggestions.length === 0 && (
                                <div className="py-6 text-center text-sm text-muted-foreground">
                                    {status === "ZERO_RESULTS" ? "No locations found." : "Typing..."}
                                </div>
                            )}
                        </CommandList>
                    </Command>
                </div>
            )}
        </div>
    );
}
