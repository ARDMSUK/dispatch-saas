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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
            // Bias towards Bourne End (SL8)
            locationBias: {
                center: { lat: 51.576, lng: -0.708 },
                radius: 16000 // 10 miles (~16km)
            }
        },
        debounce: 300,
        initOnMount: false, // Wait for Google Maps script
    });

    // --- CUSTOM SHORTCUTS LOGIC ---
    const [customSuggestions, setCustomSuggestions] = useState<{ id: string, label: string, address: string }[]>([]);
    const [frequentLocations, setFrequentLocations] = useState<{ address: string, count: number }[]>([]);

    // Fetch Frequent Locations on Mount
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

        // Heathrow Terminals Shortcuts (T2, T3, T4, T5, T6?? No T1 operational really but add if needed)
        // User asked for T1, T2 etc.
        if (input.match(/^t[1-5]$/)) {
            const term = input.replace('t', '');
            matches.push({
                id: `lhr-t${term}`,
                label: `Heathrow Terminal ${term}`,
                address: `Heathrow Terminal ${term}, Longford, Hounslow, UK`
            });
        }

        // Also match "Heathrow ..."
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

        setCustomSuggestions(matches.slice(0, 4)); // Limit to avoid spam
    }, [inputValue]);


    // Sync external value with internal state if needed
    useEffect(() => {
        if (value !== inputValue) {
            setValue(value, false);
        }
    }, [value, setValue]);

    // Handle Google Maps script loading status
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
            // Fallback for manual precise address if needed
            toast.error("Could not fetch precise location, using address text.");
            if (onChange) onChange(address);
        }
    };

    // Manual Select for Custom Suggestions (skips Autocomplete API for basic text, but we still Geocode it)
    const handleCustomSelect = async (item: { label: string, address: string }) => {
        setValue(item.address, false);
        clearSuggestions();
        setOpen(false);
        try {
            // We still need coords
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
            <Button variant="outline" disabled className={cn("w-full justify-start text-muted-foreground", className)}>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading maps...
            </Button>
        )
    }

    // Filter Frequent based on input (if input exists)
    const filteredFrequent = inputValue.length < 2
        ? frequentLocations
        : frequentLocations.filter(L => L.address.toLowerCase().includes(inputValue.toLowerCase()));

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className={cn("w-full justify-start text-left font-normal truncate", !value && "text-muted-foreground", className)}
                    disabled={disabled || !ready}
                >
                    <MapPin className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                    {value || placeholder}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 z-[10000] bg-zinc-900 border border-white/10 shadow-2xl" align="start" onOpenAutoFocus={(e) => e.preventDefault()}>
                <Command shouldFilter={false} className="bg-zinc-900">
                    <CommandInput
                        placeholder={placeholder}
                        value={inputValue}
                        onValueChange={(val) => {
                            setValue(val);
                            if (onChange) onChange(val);
                        }}
                    />
                    <CommandList>
                        {/* FREQUENT LOCATIONS */}
                        {filteredFrequent.length > 0 && (
                            <CommandGroup heading="Most Used" className="text-emerald-500">
                                {filteredFrequent.map((item, i) => (
                                    <CommandItem
                                        key={`freq-${i}`}
                                        value={item.address}
                                        onSelect={() => handleFrequentSelect(item.address)}
                                        className="cursor-pointer p-2 text-white bg-emerald-500/10 hover:bg-emerald-500/20 mb-1 rounded-sm border border-emerald-500/20"
                                    >
                                        <MapPin className="mr-2 h-4 w-4 text-emerald-500" />
                                        <span className="font-medium truncate">{item.address}</span>
                                        <span className="ml-auto text-[10px] text-zinc-500 bg-black/40 px-1 rounded">{item.count}</span>
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        )}

                        {/* CUSTOM SHORTCUTS */}
                        {customSuggestions.length > 0 && (
                            <CommandGroup heading="Quick Matches" className="text-amber-500">
                                {customSuggestions.map((item) => (
                                    <CommandItem
                                        key={item.id}
                                        value={item.label} // Use label for display/selection
                                        onSelect={() => handleCustomSelect(item)}
                                        className="cursor-pointer p-2 text-white bg-amber-500/10 hover:bg-amber-500/20 mb-1 rounded-sm border border-amber-500/20"
                                    >
                                        <Plane className="mr-2 h-4 w-4 text-amber-500" />
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
                                        className="data-[selected=true]:bg-zinc-800 data-[selected=true]:text-amber-500 cursor-pointer p-2 text-white"
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
            </PopoverContent>
        </Popover>
    );
}
