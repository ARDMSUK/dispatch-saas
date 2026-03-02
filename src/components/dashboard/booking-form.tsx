'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Navigation, User, Zap, Plane, Plus, X, RotateCw, MapPin, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { LocationInput } from './location-input';
import { PaymentModal } from './payment-modal';

type BookingFormProps = {
    onJobCreated: () => void;
};

// Helper: Calculate Haversine Distance (Miles)
function getHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 3958.8; // Radius of Earth in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

export function BookingForm({ onJobCreated }: BookingFormProps) {
    const searchParams = useSearchParams();

    // --- STATE ---
    const [pickup, setPickup] = useState('');
    const [dropoff, setDropoff] = useState('');
    const [pickupCoords, setPickupCoords] = useState<{ lat: number; lng: number } | null>(null);
    const [dropoffCoords, setDropoffCoords] = useState<{ lat: number; lng: number } | null>(null);
    const [vias, setVias] = useState<{ address: string, lat?: number, lng?: number }[]>([]);

    // Details
    const [passengerName, setPassengerName] = useState('');
    const [passengerPhone, setPassengerPhone] = useState('');
    const [passengerEmail, setPassengerEmail] = useState('');
    const [passengers, setPassengers] = useState(1);
    const [luggage, setLuggage] = useState(0);
    const [vehicleType, setVehicleType] = useState('Saloon');
    const [paymentType, setPaymentType] = useState('CASH');
    const [flightNumber, setFlightNumber] = useState('');
    const [accounts, setAccounts] = useState<{ id: string, name: string, code: string }[]>([]);
    const [selectedAccountId, setSelectedAccountId] = useState('');
    const [instructions, setInstructions] = useState('');
    const [reminders, setReminders] = useState('');
    const [debugData, setDebugData] = useState<any>(null); // DEBUG STATE

    // Auto-fill from CLI pop URL parameters and strip from URL
    useEffect(() => {
        if (typeof window === 'undefined') return;

        const params = new URLSearchParams(window.location.search);
        const phoneParam = params.get('phone') || params.get('cli') || params.get('caller_id');
        const nameParam = params.get('name');

        let shouldCleanUrl = false;

        if (phoneParam) {
            const decodedPhone = decodeURIComponent(phoneParam);
            setPassengerPhone(decodedPhone);
            handlePhoneLookup(decodedPhone); // Moved lookup here from the old duplicated hook
            shouldCleanUrl = true;
        }

        if (nameParam) {
            setPassengerName(decodeURIComponent(nameParam));
            shouldCleanUrl = true;
        }

        if (shouldCleanUrl) {
            // Strip the query parameters from the URL silently without reloading the page
            // This allows the user to manually erase the fields or refresh the page without it
            // being stubbornly re-filled from the ghost URL state!
            params.delete('phone');
            params.delete('cli');
            params.delete('caller_id');
            params.delete('name');

            const newSearch = params.toString();
            const newUrl = window.location.pathname + (newSearch ? '?' + newSearch : '');
            window.history.replaceState(null, '', newUrl);
        }
    }, [searchParams]);

    useEffect(() => {
        if (paymentType === 'ACCOUNT') {
            fetch('/api/accounts')
                .then(res => res.json())
                .then(data => {
                    if (Array.isArray(data)) setAccounts(data);
                })
                .catch(err => console.error(err));
        }
    }, [paymentType]);

    // Timing
    const [pickupTime, setPickupTime] = useState(() => {
        const now = new Date();
        now.setMinutes(now.getMinutes() + 10);
        return now.toISOString().slice(0, 16);
    });

    // Return Booking
    const [isReturn, setIsReturn] = useState(false);
    const [returnDate, setReturnDate] = useState('');
    const [returnPickup, setReturnPickup] = useState('');
    const [returnDropoff, setReturnDropoff] = useState('');
    const [returnPickupCoords, setReturnPickupCoords] = useState<{ lat: number; lng: number } | null>(null);
    const [returnDropoffCoords, setReturnDropoffCoords] = useState<{ lat: number; lng: number } | null>(null);
    const [returnFlightNumber, setReturnFlightNumber] = useState('');
    const [returnPassengers, setReturnPassengers] = useState(1);
    const [returnLuggage, setReturnLuggage] = useState(0);
    const [returnNotes, setReturnNotes] = useState('');

    // Wait & Return
    const [isWaitAndReturn, setIsWaitAndReturn] = useState(false);
    const [waitingTime, setWaitingTime] = useState(0); // Minutes

    // Recurring
    const [isRecurring, setIsRecurring] = useState(false);
    const [recurrenceRule, setRecurrenceRule] = useState('DAILY'); // DAILY, WEEKLY, MON,WED,FRI
    const [recurrenceEnd, setRecurrenceEnd] = useState('');

    // Dispatch Config
    const [autoDispatch, setAutoDispatch] = useState(true);


    // ... (useEffect omitted for brevity, logic unchanged)

    // Auto-swap addresses for return OR Wait & Return
    useEffect(() => {
        if (isReturn) {
            if (!returnPickup && dropoff) {
                setReturnPickup(dropoff);
                setReturnPickupCoords(dropoffCoords);
            }
            if (!returnDropoff && pickup) {
                setReturnDropoff(pickup);
                setReturnDropoffCoords(pickupCoords);
            }
            if (returnPassengers === 1) setReturnPassengers(passengers);
            if (returnLuggage === 0) setReturnLuggage(luggage);
        }
    }, [isReturn, pickup, dropoff, pickupCoords, dropoffCoords, passengers, luggage, returnPickup, returnDropoff, returnPassengers, returnLuggage]);

    // Wait & Return Logic overrides Return
    useEffect(() => {
        if (isWaitAndReturn) {
            setIsReturn(false); // Can't be both
            // Recalculate price when waiting time changes
            if (pickup && dropoff) handleCalculate();
        }
    }, [isWaitAndReturn, waitingTime]);


    // Pricing
    const [quotedPrice, setQuotedPrice] = useState<number | null>(null);
    const [isCalculating, setIsCalculating] = useState(false);

    // Verify Price on Coords OR Address Change (Debounced)
    useEffect(() => {
        const hasCoords = pickupCoords && dropoffCoords;
        const hasValidText = pickup.length > 3 && dropoff.length > 3;

        if (hasCoords || hasValidText) {
            const timer = setTimeout(() => {
                handleCalculate();
            }, 800);
            return () => clearTimeout(timer);
        }
    }, [pickup, dropoff, pickupCoords, dropoffCoords, vias, isWaitAndReturn, waitingTime]);


    // --- ACTIONS ---
    const handleCalculate = async (vehicleOverride?: string) => {
        if (!pickup || !dropoff) return; // Don't calc if empty

        setIsCalculating(true);
        const currentVehicle = vehicleOverride || vehicleType;
        let distanceMiles = 0;

        try {
            if (typeof window !== 'undefined' && window.google && window.google.maps) {
                const directionsService = new google.maps.DirectionsService();
                // Check if we have coords, if not fall back to address string
                // But we recommend ensuring coords are set via LocationInput

                const validVias = vias.filter(v => v.address && v.address.length > 3).map(v => ({
                    location: (v.lat && v.lng) ? { lat: v.lat, lng: v.lng } : v.address,
                    stopover: true
                }));

                const origin = pickupCoords ? { lat: pickupCoords.lat, lng: pickupCoords.lng } : pickup;
                const destination = dropoffCoords ? { lat: dropoffCoords.lat, lng: dropoffCoords.lng } : dropoff;

                const result = await directionsService.route({
                    origin: origin,
                    destination: destination,
                    waypoints: validVias,
                    travelMode: google.maps.TravelMode.DRIVING
                });

                if (result.routes[0] && result.routes[0].legs) {
                    let totalMeters = 0;
                    result.routes[0].legs.forEach(leg => {
                        totalMeters += leg.distance?.value || 0;
                    });
                    distanceMiles = totalMeters / 1609.34;
                }
            } else {
                // Fallback Haversine if Google not loaded
                if (pickupCoords && dropoffCoords) {
                    distanceMiles = getHaversineDistance(pickupCoords.lat, pickupCoords.lng, dropoffCoords.lat, dropoffCoords.lng);
                }
            }
        } catch (error: any) {
            console.warn("Google Maps Distance failed, using fallback.", error);
            if (pickupCoords && dropoffCoords) {
                distanceMiles = getHaversineDistance(pickupCoords.lat, pickupCoords.lng, dropoffCoords.lat, dropoffCoords.lng);
            }
        }



        try {
            const payload = {
                pickup, dropoff, vias, vehicleType: currentVehicle, distance: distanceMiles > 0 ? distanceMiles : undefined,
                waitingTime: isWaitAndReturn ? waitingTime : 0,
                isWaitAndReturn,
                pickupLat: pickupCoords?.lat,
                pickupLng: pickupCoords?.lng,
                dropoffLat: dropoffCoords?.lat,
                dropoffLng: dropoffCoords?.lng
            };

            const res = await fetch('/api/pricing/calculate', {
                method: 'POST',
                body: JSON.stringify(payload),
            });
            const data = await res.json();

            setDebugData({
                payload,
                response: data,
                status: res.status
            }); // CAPTURE DEBUG DATA

            if (data.error) {
                console.error("Pricing API Error:", data.error, data.details);
                toast.error("Pricing Failed", {
                    description: String(data.error),
                    duration: 5000
                });
            }

            if (data.price) setQuotedPrice(data.price);
        } catch (e: any) {
            console.error("Pricing failed", e);
            setDebugData({ error: e.message });
        } finally {
            setIsCalculating(false);
        }
    };

    const [meetAndGreet, setMeetAndGreet] = useState(false);



    // Payment Integration
    const [showPaymentModal, setShowPaymentModal] = useState(false);

    // Initial check: Validate Flight Terminal then proceed
    const handlePreSubmit = async () => {
        if (!pickup || !dropoff) {
            toast.error("Please select a route first");
            return;
        }

        // Mandatory Flight Number Validation for Airports
        if (showFlightInput && !flightNumber) {
            toast.error("Flight Number Required", { description: "Please enter a flight number for airport transfers." });
            return;
        }

        if (isReturn && showFlightInput && !returnFlightNumber) {
            toast.error("Return Flight Number Required", { description: "Please enter the return flight number for the airport." });
            return;
        }

        // --- Terminal Validation Logic ---
        if (showFlightInput && flightNumber) {
            try {
                const res = await fetch(`/api/flights?flightNumber=${encodeURIComponent(flightNumber)}`);
                if (res.ok) {
                    const flightData = await res.json();

                    if (flightData && flightData.terminal && !flightData.error && flightData.airline && !flightData.airline.includes('[MOCK]')) {
                        const actualTerminal = flightData.terminal.toString();
                        const pickupLower = pickup.toLowerCase();

                        // Extract terminal numbers from pickup string like "Terminal 5" or "T5"
                        const tMatch = pickupLower.match(/(?:terminal\s*|t\s*)(\d)/i);
                        const enteredTerminal = tMatch ? tMatch[1] : null;

                        if (enteredTerminal && enteredTerminal !== actualTerminal) {
                            toast.error("Terminal Mismatch Detected", {
                                description: `Flight ${flightNumber} arrives at Terminal ${actualTerminal}, but you entered Terminal ${enteredTerminal}. Please correct the pickup address.`,
                                duration: 8000
                            });
                            return; // Hard Block
                        }
                    }
                }
            } catch (error) {
                console.error("Flight validation failed", error);
                // Fail open if API is down
            }
        }

        if (paymentType === 'CARD') {
            if (!quotedPrice || quotedPrice <= 0) {
                toast.error("Price not calculated yet");
                return;
            }
            setShowPaymentModal(true);
        } else {
            handleCreateJob();
        }
    };

    // Fix: Separate the event handler from the logic
    const handleCreateJob = async (paymentIntentId?: string) => {
        try {
            // Compose Notes
            let combinedNotes = instructions;
            const prefixParts = [];
            if (reminders) prefixParts.push(`REMINDER: ${reminders}`);
            if (meetAndGreet) prefixParts.push(`MEET & GREET p/u`);

            if (prefixParts.length > 0) {
                combinedNotes = `[${prefixParts.join(' | ')}]\n${instructions}`;
            }

            const payload = {
                pickupAddress: pickup,
                dropoffAddress: dropoff,
                pickupLat: pickupCoords?.lat,
                pickupLng: pickupCoords?.lng,
                dropoffLat: dropoffCoords?.lat,
                dropoffLng: dropoffCoords?.lng,
                vias,
                passengerName,
                passengerPhone,
                passengerEmail,
                pickupTime: new Date(pickupTime).toISOString(),
                vehicleType,
                passengers,
                luggage,
                flightNumber: flightNumber || null,
                paymentType,
                accountId: paymentType === 'ACCOUNT' ? selectedAccountId : null,
                notes: combinedNotes,
                fare: quotedPrice,
                // Payment
                stripePaymentIntentId: paymentIntentId || null,
                paymentStatus: paymentIntentId ? 'AUTHORIZED' : (paymentType === 'ACCOUNT' ? 'UNPAID' : 'UNPAID'),
                // Wait & Return
                waitingTime: isWaitAndReturn ? waitingTime : 0,
                isWaitAndReturn,
                // Dispatch
                autoDispatch,
                // Recurrence
                isRecurring,
                recurrenceRule: isRecurring ? recurrenceRule : null,
                recurrenceEnd: isRecurring ? recurrenceEnd : null,
                // Return Details
                returnBooking: isReturn,
                returnDate: isReturn && returnDate ? new Date(returnDate).toISOString() : null,
                returnPickupAddress: isReturn ? returnPickup : null,
                returnDropoffAddress: isReturn ? returnDropoff : null,
                returnFlightNumber: isReturn ? returnFlightNumber : null,
                returnPassengers: isReturn ? returnPassengers : null,
                returnLuggage: isReturn ? returnLuggage : null,
                returnNotes: isReturn ? returnNotes : null
            };


            const res = await fetch('/api/jobs', {
                method: 'POST',
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.details || errData.error || "Failed to create job");
            }

            toast.success(isReturn ? "Outbound & Return Jobs Dispatched" : "Job Dispatched Successfully", {
                description: `Booking for ${passengerName} created.`
            });

            onJobCreated();
            resetForm();

        } catch (e: any) {
            toast.error("Failed to create booking", { description: e.message });
            console.error(e);
        }
    };

    const resetForm = () => {
        setPickup('');
        setDropoff('');
        setVias([]);
        setPassengerName('');
        setPassengerPhone('');
        setPassengerEmail('');
        setPassengers(1);
        setLuggage(0);
        setFlightNumber('');
        setQuotedPrice(null);
        setInstructions('');
        setReminders('');
        setSelectedAccountId('');
        setMeetAndGreet(false); // Reset M&G
        setIsReturn(false);
        setReturnDate('');
        setReturnPickup('');
        setReturnDropoff('');
        setReturnFlightNumber('');
        setReturnPassengers(1);
        setReturnLuggage(0);
        setReturnNotes('');
        setIsWaitAndReturn(false);
        setWaitingTime(0);
        setIsRecurring(false);
        setRecurrenceRule('DAILY');
        setRecurrenceEnd('');
        setAutoDispatch(true);

        const now = new Date();
        now.setMinutes(now.getMinutes() + 10);
        setPickupTime(now.toISOString().slice(0, 16));
    };

    // ...

    const addVia = () => { setVias([...vias, { address: '' }]); };
    const removeVia = (index: number) => { const newVias = [...vias]; newVias.splice(index, 1); setVias(newVias); };
    const updateVia = (index: number, address: string, lat?: number, lng?: number) => { const newVias = [...vias]; newVias[index].address = address; if (lat) newVias[index].lat = lat; if (lng) newVias[index].lng = lng; setVias(newVias); };
    const isAirport = (address: string) => { return address.toLowerCase().includes('terminal') || address.toLowerCase().includes('airport') || address.toLowerCase().includes('gatwick') || address.toLowerCase().includes('heathrow'); }
    const showFlightInput = isAirport(pickup) || isAirport(dropoff);

    // Reset M&G if not airport
    useEffect(() => {
        if (!showFlightInput) setMeetAndGreet(false);
    }, [showFlightInput]);

    const [customerStats, setCustomerStats] = useState<{ total: number, lastDate: string } | null>(null);

    // (Check for CLI / URL Phone Param effect was removed and merged into the top-level URL parser)

    const handlePhoneLookup = async (phoneVal: string) => {
        if (!phoneVal || phoneVal.length < 5) return;

        try {
            const res = await fetch(`/api/customers/lookup?phone=${encodeURIComponent(phoneVal)}`);
            if (res.ok) {
                const data = await res.json();
                if (data.found && data.customer) {
                    toast.success("Customer Found", { description: `Welcome back, ${data.customer.name || 'valued customer'}` });

                    // Auto-populate Details
                    if (data.customer.name) setPassengerName(data.customer.name);
                    if (data.customer.email) setPassengerEmail(data.customer.email);

                    // Auto-populate Journey (Last Job)
                    if (data.lastJob) {
                        setPickup(data.lastJob.pickup);
                        // We'd ideally set coords too if we had a way to pass them directly to LocationInput or state
                        if (data.lastJob.pickupLat && data.lastJob.pickupLng) {
                            setPickupCoords({ lat: data.lastJob.pickupLat, lng: data.lastJob.pickupLng });
                        }

                        setDropoff(data.lastJob.dropoff);
                        if (data.lastJob.dropoffLat && data.lastJob.dropoffLng) {
                            setDropoffCoords({ lat: data.lastJob.dropoffLat, lng: data.lastJob.dropoffLng });
                        }
                    }

                    // Stats
                    if (data.stats) {
                        setCustomerStats({
                            total: data.stats.totalBookings,
                            lastDate: data.stats.lastBookingDate
                        });
                    }
                }
            }
        } catch (e) {
            console.error("Lookup error", e);
        }
    };


    return (
        <div className="flex flex-col gap-5 h-full">
            {/* Header ... */}
            <div>
                {/* Header Cleaned */}
                <h1 className="text-2xl font-bold text-white">Booking Console</h1>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 space-y-4">
                {/* 1. PICKUP TIME ... (Unchanged) */}
                <div className="space-y-3">
                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Pickup Date & Time</label>
                    <div className="flex gap-2">
                        <input
                            type="datetime-local"
                            className="flex-1 bg-black/40 border border-white/10 rounded-md py-2.5 px-3 text-sm text-white focus:outline-none focus:border-amber-400/50 [color-scheme:dark]"
                            value={pickupTime}
                            onChange={e => setPickupTime(e.target.value)}
                        />
                        <Button
                            variant="outline"
                            className={`h-[42px] px-3 border-white/10 ${pickupTime.includes('T') ? 'bg-amber-500/10 text-amber-500 border-amber-500/50' : 'bg-black/40 text-zinc-400'}`}
                            onClick={() => {
                                const now = new Date();
                                now.setMinutes(now.getMinutes() + 10); // ASAP = +10 mins
                                setPickupTime(now.toISOString().slice(0, 16));
                            }}
                        >
                            ASAP
                        </Button>
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                        <Button type="button" variant="outline" size="sm" className="bg-black/20 border-white/10 text-xs px-2 h-7"
                            onClick={() => { const now = new Date(); now.setMinutes(now.getMinutes() + 15); const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16); setPickupTime(local); }}>ASAP (+15m)</Button>
                        <Button type="button" variant="outline" size="sm" className="bg-black/20 border-white/10 text-xs px-2 h-7"
                            onClick={() => { const now = new Date(); now.setMinutes(now.getMinutes() + 30); const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16); setPickupTime(local); }}>+30m</Button>
                        <Button type="button" variant="outline" size="sm" className="bg-black/20 border-white/10 text-xs px-2 h-7"
                            onClick={() => { const now = new Date(); now.setHours(now.getHours() + 1); const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16); setPickupTime(local); }}>+1h</Button>
                        <Button type="button" variant="outline" size="sm" className="bg-black/20 border-white/10 text-xs px-2 h-7"
                            onClick={() => { const now = new Date(); now.setDate(now.getDate() + 1); now.setHours(9, 0, 0, 0); const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16); setPickupTime(local); }}>Tomorrow 9AM</Button>
                    </div>
                </div>

                {/* 2. CUSTOMER PHONE */}
                <div className="space-y-3 p-3 bg-amber-500/5 border border-amber-500/10 rounded-lg">
                    <div className="flex justify-between items-end">
                        <label className="text-xs font-bold text-amber-500 uppercase tracking-wider flex items-center gap-2">
                            <Phone className="h-3 w-3" /> Customer Mobile
                        </label>
                        {customerStats && (
                            <div className="text-[10px] text-right">
                                <span className="block text-emerald-400 font-bold">{customerStats.total} Previous Jobs</span>
                                <span className="block text-zinc-500">Last: {new Date(customerStats.lastDate).toLocaleDateString()}</span>
                            </div>
                        )}
                    </div>
                    <input
                        type="tel"
                        placeholder="Enter Number (e.g. 077...)"
                        className="w-full bg-black/40 border border-white/10 rounded-md py-2.5 px-3 text-lg font-mono text-white focus:outline-none focus:border-amber-400/50"
                        value={passengerPhone}
                        onChange={e => setPassengerPhone(e.target.value)}
                        onBlur={() => handlePhoneLookup(passengerPhone)}
                    />
                </div>

                <div className="border-t border-white/5 my-4"></div>

                {/* 2. ROUTE ... (Unchanged) */}
                <div className="space-y-3">
                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Journey</label>
                    {/* Pickup */}
                    <div className="relative group z-50">
                        <div className="absolute left-3 top-3 text-emerald-500"><Navigation className="h-4 w-4" /></div>
                        <LocationInput placeholder="Pickup Location (e.g. Heathrow T5)" className="w-full bg-black/40 border border-white/10 rounded-md py-6 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-amber-400/50 focus:ring-1 focus:ring-amber-400/20 transition-all placeholder:text-zinc-600" value={pickup} onChange={(val) => { setPickup(val); setPickupCoords(null); setQuotedPrice(null); }} onLocationSelect={(loc) => { setPickup(loc.address); setPickupCoords({ lat: loc.lat, lng: loc.lng }); }} />
                    </div>
                    {/* Vias */}
                    {vias.map((via, index) => (
                        <div key={index} className="relative group flex gap-2">
                            <div className="relative flex-1">
                                <div className="absolute left-3 top-3 text-zinc-500"><MapPin className="h-4 w-4" /></div>
                                <LocationInput placeholder={`Via #${index + 1}`} className="w-full bg-black/40 border border-white/10 rounded-md py-6 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-amber-400/50" value={via.address} onChange={(val) => updateVia(index, val)} onLocationSelect={(loc) => { updateVia(index, loc.address, loc.lat, loc.lng); }} />
                            </div>
                            <Button size="icon" variant="ghost" className="text-red-500 hover:text-red-400 hover:bg-white/5" onClick={() => removeVia(index)}><X className="h-4 w-4" /></Button>
                        </div>
                    ))}
                    <button onClick={addVia} className="text-xs text-amber-500 hover:text-amber-400 flex items-center gap-1 font-medium"><Plus className="h-3 w-3" /> Add Stop / Via</button>
                    {/* Dropoff */}
                    <div className="relative group z-40">
                        <div className="absolute left-3 top-3 text-amber-500"><MapPin className="h-4 w-4" /></div>
                        <LocationInput placeholder="Destination" className="w-full bg-black/40 border border-white/10 rounded-md py-6 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-amber-400/50 focus:ring-1 focus:ring-amber-400/20 transition-all placeholder:text-zinc-600" value={dropoff} onChange={(val) => { setDropoff(val); setDropoffCoords(null); setQuotedPrice(null); }} onLocationSelect={(loc) => { setDropoff(loc.address); setDropoffCoords({ lat: loc.lat, lng: loc.lng }); setTimeout(() => handleCalculate(), 100); }} />
                    </div>
                    {/* Flight */}
                    {showFlightInput && (
                        <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                            <div className="relative group">
                                <div className="absolute left-3 top-3 text-blue-400"><Plane className="h-4 w-4" /></div>
                                <input type="text" placeholder="Flight Number (e.g. BA101)" className="w-full bg-blue-500/10 border border-blue-500/30 rounded-md py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-blue-400/50" value={flightNumber} onChange={e => setFlightNumber(e.target.value.toUpperCase())} />
                            </div>

                            {/* Meet & Greet Toggle */}
                            <div className="flex items-center gap-3 p-2 rounded border border-blue-500/30 bg-blue-500/10">
                                <input
                                    type="checkbox"
                                    id="mgToggle"
                                    checked={meetAndGreet}
                                    onChange={(e) => setMeetAndGreet(e.target.checked)}
                                    className="w-4 h-4 rounded border-blue-500 text-blue-500 focus:ring-blue-500/20"
                                />
                                <label htmlFor="mgToggle" className="text-sm text-blue-200 flex-1 cursor-pointer select-none">
                                    Meet & Greet Required?
                                </label>
                            </div>
                        </div>
                    )}
                </div>

                <div className="border-t border-white/5 my-4"></div>

                {/* 3. DETAILS SECTION (Modified) */}
                <div className="space-y-3">
                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Customer Details</label>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="relative">
                            <div className="absolute left-3 top-3 text-zinc-500">
                                <User className="h-4 w-4" />
                            </div>
                            {/* Renamed Placeholder to 'Customer' */}
                            <input
                                type="text"
                                placeholder="Customer"
                                className="w-full bg-black/40 border border-white/10 rounded-md py-2.5 pl-10 pr-2 text-sm text-white focus:outline-none focus:border-amber-400/50"
                                value={passengerName}
                                onChange={e => setPassengerName(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* EMAIL FIELD (New) */}
                    <div className="relative">
                        <div className="absolute left-3 top-3 text-zinc-500">
                            <span className="text-xs font-bold">@</span>
                        </div>
                        <input
                            type="email"
                            placeholder="Email Address"
                            className="w-full bg-black/40 border border-white/10 rounded-md py-2.5 pl-10 pr-2 text-sm text-white focus:outline-none focus:border-amber-400/50"
                            value={passengerEmail}
                            onChange={e => setPassengerEmail(e.target.value)}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="relative">
                            <span className="absolute left-3 top-2.5 text-xs text-zinc-500 font-bold">PAX</span>
                            <input
                                type="number"
                                min="1"
                                max="16"
                                className="w-full bg-black/40 border border-white/10 rounded-md py-2.5 pl-10 pr-2 text-sm text-white focus:outline-none focus:border-amber-400/50"
                                value={passengers}
                                onChange={e => setPassengers(parseInt(e.target.value))}
                            />
                        </div>
                        <div className="relative">
                            <span className="absolute left-3 top-2.5 text-xs text-zinc-500 font-bold">LUG</span>
                            <input
                                type="number"
                                min="0"
                                max="10"
                                className="w-full bg-black/40 border border-white/10 rounded-md py-2.5 pl-10 pr-2 text-sm text-white focus:outline-none focus:border-amber-400/50"
                                value={luggage}
                                onChange={e => setLuggage(parseInt(e.target.value))}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                        <select
                            className="w-full bg-black/40 border border-white/10 rounded-md py-2.5 px-3 text-sm text-white focus:outline-none focus:border-amber-400/50 appearance-none"
                            value={vehicleType}
                            onChange={e => {
                                const newVal = e.target.value;
                                setVehicleType(newVal);
                                handleCalculate(newVal);
                            }}
                        >
                            <option value="Saloon">Saloon</option>
                            <option value="Estate">Estate</option>
                            <option value="Executive">Executive</option>
                            <option value="MPV">MPV 6 Seater</option>
                            <option value="MPV8">MPV 8 Seater</option>
                            <option value="Minibus">Minibus</option>
                            <option value="Coach">Coach</option>
                        </select>
                    </div>

                    {/* ACCOUNT SELECTION */}
                    {paymentType === 'ACCOUNT' && (
                        <div className="grid grid-cols-1 gap-3 animate-in fade-in slide-in-from-top-1">
                            <select
                                className="w-full bg-indigo-500/10 border border-indigo-500/30 rounded-md py-2.5 px-3 text-sm text-indigo-300 font-bold focus:outline-none focus:border-indigo-400/50 appearance-none"
                                value={selectedAccountId}
                                onChange={e => setSelectedAccountId(e.target.value)}
                            >
                                <option value="">-- Select Account --</option>
                                {accounts.map(acc => (
                                    <option key={acc.id} value={acc.id}>
                                        {acc.code} - {acc.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                    <div className="grid grid-cols-1 gap-3">
                        <select
                            className="w-full bg-black/40 border border-white/10 rounded-md py-2.5 px-3 text-sm text-emerald-400 font-bold focus:outline-none focus:border-amber-400/50"
                            value={paymentType}
                            onChange={e => setPaymentType(e.target.value)}
                        >
                            <option value="CASH">💵 CASH PAYMENT</option>
                            <option value="CARD">💳 CARD / PRE-PAID</option>
                            <option value="ACCOUNT">🏢 ACCOUNT (INVOICE)</option>
                        </select>
                    </div>

                    {/* INSTRUCTIONS (New) */}
                    <textarea
                        placeholder="Instructions (Notes)..."
                        rows={2}
                        className="w-full bg-black/40 border border-white/10 rounded-md py-2.5 px-3 text-sm text-white focus:outline-none focus:border-amber-400/50 resize-none"
                        value={instructions}
                        onChange={e => setInstructions(e.target.value)}
                    />

                    {/* REMINDERS (New) */}
                    <select
                        className="w-full bg-blue-500/10 border border-blue-500/30 rounded-md py-2.5 px-3 text-sm text-white focus:outline-none focus:border-blue-400/50 appearance-none"
                        value={reminders}
                        onChange={e => setReminders(e.target.value)}
                    >
                        <option value="">-- No Reminders --</option>
                        <option value="Checked Bags">Checked Bags</option>
                        <option value="Remember to take baby seat">Remember to take baby seat</option>
                        <option value="Dont ring doorbell">Don't ring doorbell</option>
                        <option value="Call when outside">Call when outside</option>
                    </select>

                </div>

                <div className="border-t border-white/5 my-4"></div>

                {/* 4. RETURN OPTION (Renamed from Schedule) */}
                <div className="space-y-3">
                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Return Journey</label>

                    {/* WAIT & RETURN TOGGLE */}
                    <div className="flex items-center gap-3 p-2 rounded border border-white/5 bg-white/5">
                        <input
                            type="checkbox"
                            id="waitReturnToggle"
                            checked={isWaitAndReturn}
                            onChange={(e) => setIsWaitAndReturn(e.target.checked)}
                            className="w-4 h-4 rounded border-zinc-600 bg-black/40 text-amber-500 focus:ring-amber-500/20"
                        />
                        <label htmlFor="waitReturnToggle" className="text-sm text-white flex-1 cursor-pointer select-none flex items-center gap-2">
                            <RotateCw className="h-3 w-3 text-amber-500" /> Wait & Return
                        </label>
                    </div>

                    {isWaitAndReturn && (
                        <div className="pl-4 border-l-2 border-amber-500/20 animate-in slide-in-from-top-2 space-y-4 mt-2 mb-4">
                            <div className="space-y-2">
                                <label className="text-xs text-amber-400 font-bold">Waiting Time (Minutes)</label>
                                <input
                                    type="number"
                                    min="0"
                                    step="5"
                                    className="w-full bg-black/40 border border-white/10 rounded-md py-2.5 px-3 text-sm text-white focus:outline-none focus:border-amber-400/50"
                                    value={waitingTime}
                                    onChange={e => setWaitingTime(parseInt(e.target.value))}
                                />
                            </div>
                        </div>
                    )}

                    {/* RETURN BOOKING TOGGLE */}
                    <div className={`flex items-center gap-3 p-2 rounded border border-white/5 bg-white/5 ${isWaitAndReturn ? 'opacity-50 pointer-events-none' : ''}`}>
                        <input
                            type="checkbox"
                            id="returnToggle"
                            checked={isReturn}
                            onChange={(e) => setIsReturn(e.target.checked)}
                            disabled={isWaitAndReturn}
                            className="w-4 h-4 rounded border-zinc-600 bg-black/40 text-amber-500 focus:ring-amber-500/20"
                        />
                        <label htmlFor="returnToggle" className="text-sm text-white flex-1 cursor-pointer select-none flex items-center gap-2">
                            <RotateCw className="h-3 w-3 text-zinc-400" /> Book Return Journey
                        </label>
                    </div>

                    {/* RECURRING TOGGLE */}
                    <div className="flex items-center gap-3 p-2 rounded border border-white/5 bg-white/5 mt-2">
                        <input
                            type="checkbox"
                            id="recurringToggle"
                            checked={isRecurring}
                            onChange={(e) => setIsRecurring(e.target.checked)}
                            className="w-4 h-4 rounded border-zinc-600 bg-black/40 text-emerald-500 focus:ring-emerald-500/20"
                        />
                        <label htmlFor="recurringToggle" className="text-sm text-white flex-1 cursor-pointer select-none flex items-center gap-2">
                            <RotateCw className="h-3 w-3 text-emerald-500" /> Recurring Booking
                        </label>
                    </div>

                    <div className="flex items-center gap-3 p-2 rounded border border-indigo-500/30 bg-indigo-500/10 mb-2">
                        <input
                            type="checkbox"
                            id="autoDispatchToggle"
                            checked={autoDispatch}
                            onChange={(e) => setAutoDispatch(e.target.checked)}
                            className="w-4 h-4 rounded border-indigo-500 text-indigo-500 focus:ring-indigo-500/20"
                        />
                        <label htmlFor="autoDispatchToggle" className="text-sm text-indigo-200 flex-1 cursor-pointer select-none flex items-center gap-2">
                            <Zap className="h-3 w-3 text-indigo-500" /> Auto-Dispatch Job
                        </label>
                    </div>

                    {isRecurring && (
                        <div className="pl-4 border-l-2 border-emerald-500/20 animate-in slide-in-from-top-2 space-y-4 mt-2">
                            <div className="grid grid-cols-1 gap-3">
                                <label className="text-xs text-emerald-400 font-bold">Frequency</label>
                                <select
                                    className="w-full bg-black/40 border border-white/10 rounded-md py-2.5 px-3 text-sm text-white focus:outline-none focus:border-emerald-400/50"
                                    value={recurrenceRule}
                                    onChange={(e) => setRecurrenceRule(e.target.value)}
                                >
                                    <option value="DAILY">Daily</option>
                                    <option value="WEEKLY">Weekly</option>
                                    <option value="MON,WED,FRI">Mon, Wed, Fri</option>
                                    <option value="MON-FRI">Mon - Fri</option>
                                </select>
                            </div>
                            <div className="grid grid-cols-1 gap-3">
                                <label className="text-xs text-emerald-400 font-bold">Repeat Until</label>
                                <input
                                    type="date"
                                    className="w-full bg-black/40 border border-white/10 rounded-md py-2.5 px-3 text-sm text-white focus:outline-none focus:border-emerald-400/50 [color-scheme:dark]"
                                    value={recurrenceEnd}
                                    onChange={e => setRecurrenceEnd(e.target.value)}
                                />
                            </div>
                        </div>
                    )}

                    {isReturn && (
                        <div className="pl-4 border-l-2 border-amber-500/20 animate-in slide-in-from-top-2 space-y-4 mt-4">
                            <h3 className="text-xs text-amber-500 font-bold uppercase tracking-wider">Return Journey Details</h3>

                            {/* RETURN PICKUP */}
                            <div className="relative group z-30">
                                <div className="absolute left-3 top-3 text-emerald-500">
                                    <Navigation className="h-4 w-4" />
                                </div>
                                <LocationInput
                                    placeholder="Return Pickup (e.g. Hotel)"
                                    className="w-full bg-black/40 border border-white/10 rounded-md py-6 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-amber-400/50"
                                    value={returnPickup}
                                    onChange={setReturnPickup}
                                    onLocationSelect={(loc) => {
                                        setReturnPickup(loc.address);
                                        setReturnPickupCoords({ lat: loc.lat, lng: loc.lng });
                                    }}
                                />
                            </div>

                            {/* RETURN DROPOFF */}
                            <div className="relative group z-20">
                                <div className="absolute left-3 top-3 text-amber-500">
                                    <MapPin className="h-4 w-4" />
                                </div>
                                <LocationInput
                                    placeholder="Return Destination"
                                    className="w-full bg-black/40 border border-white/10 rounded-md py-6 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-amber-400/50"
                                    value={returnDropoff}
                                    onChange={setReturnDropoff}
                                    onLocationSelect={(loc) => {
                                        setReturnDropoff(loc.address);
                                        setReturnDropoffCoords({ lat: loc.lat, lng: loc.lng });
                                    }}
                                />
                            </div>

                            {/* RETURN DATE/TIME */}
                            <input
                                type="datetime-local"
                                className="w-full bg-black/40 border border-white/10 rounded-md py-2.5 px-3 text-sm text-white focus:outline-none focus:border-amber-400/50 [color-scheme:dark]"
                                value={returnDate}
                                onChange={e => setReturnDate(e.target.value)}
                            />

                            {/* RETURN FLIGHT (Conditional logic can be same or just show it) */}
                            <div className="relative group">
                                <div className="absolute left-3 top-3 text-blue-400">
                                    <Plane className="h-4 w-4" />
                                </div>
                                <input
                                    type="text"
                                    placeholder="Return Flight Number (Optional)"
                                    className="w-full bg-blue-500/10 border border-blue-500/30 rounded-md py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-blue-400/50"
                                    value={returnFlightNumber}
                                    onChange={e => setReturnFlightNumber(e.target.value.toUpperCase())}
                                />
                            </div>

                            {/* RETURN PAX & LUGGAGE */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="relative">
                                    <span className="absolute left-3 top-2.5 text-xs text-zinc-500 font-bold">PAX</span>
                                    <input
                                        type="number"
                                        min="1"
                                        max="16"
                                        className="w-full bg-black/40 border border-white/10 rounded-md py-2.5 pl-10 pr-2 text-sm text-white focus:outline-none focus:border-amber-400/50"
                                        value={returnPassengers}
                                        onChange={e => setReturnPassengers(parseInt(e.target.value))}
                                    />
                                </div>
                                <div className="relative">
                                    <span className="absolute left-3 top-2.5 text-xs text-zinc-500 font-bold">LUG</span>
                                    <input
                                        type="number"
                                        min="0"
                                        max="10"
                                        className="w-full bg-black/40 border border-white/10 rounded-md py-2.5 pl-10 pr-2 text-sm text-white focus:outline-none focus:border-amber-400/50"
                                        value={returnLuggage}
                                        onChange={e => setReturnLuggage(parseInt(e.target.value))}
                                    />
                                </div>
                            </div>

                            {/* RETURN NOTES */}
                            <input
                                type="text"
                                placeholder="Return Journey Notes..."
                                className="w-full bg-black/40 border border-white/10 rounded-md py-2.5 px-3 text-sm text-white focus:outline-none focus:border-amber-400/50"
                                value={returnNotes}
                                onChange={e => setReturnNotes(e.target.value)}
                            />
                        </div>
                    )}
                </div>

                {/* QUOTE & SUBMIT */}
                <div className={`mt-6 p-4 rounded-lg border border-dashed transition-all duration-300 ${quotedPrice ? "bg-emerald-500/10 border-emerald-500/30" : "bg-white/5 border-white/10"}`}>
                    <div className="flex justify-between items-center">
                        <span className="text-zinc-400 text-xs uppercase tracking-wider font-bold">Estimated Fare</span>
                        {isCalculating ? (
                            <span className="text-amber-400 text-xs animate-pulse">Calculating...</span>
                        ) : (
                            <div className="flex flex-col items-end">
                                <div className="flex items-center justify-end group" title="Click to manually override fare">
                                    <span className="text-2xl font-mono text-white">£</span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        className="w-24 bg-transparent border-b border-dashed border-white/30 hover:border-amber-400 focus:border-amber-400 focus:border-solid text-2xl font-mono text-white text-right focus:outline-none transition-all ml-1 py-0 px-0"
                                        value={quotedPrice !== null ? quotedPrice : ''}
                                        onChange={(e) => setQuotedPrice(e.target.value ? parseFloat(e.target.value) : null)}
                                        placeholder="0.00"
                                    />
                                </div>
                                <span className="block text-[10px] text-zinc-500 mt-1">
                                    {debugData?.payload?.distance ? `${debugData.payload.distance.toFixed(1)} miles` : '0.0 miles'}
                                </span>
                                {isReturn && quotedPrice !== null && (
                                    <span className="text-[10px] text-zinc-500 block">+ £{quotedPrice.toFixed(2)} Return Est.</span>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <Button
                    className="w-full bg-amber-400 hover:bg-amber-300 text-black font-bold h-12 text-md shadow-[0_0_20px_rgba(251,191,36,0.3)] border-0 mt-4"
                    onClick={handlePreSubmit}
                    disabled={!pickup || !dropoff || !passengerName}
                >
                    {isReturn ? 'SAVE BOOKING + RETURN' : 'SAVE BOOKING'}
                </Button>

            </div>
            {/* Payment Modal */}
            <PaymentModal
                open={showPaymentModal}
                onOpenChange={setShowPaymentModal}
                amount={quotedPrice || 0}
                onPaymentSuccess={(pid) => {
                    setShowPaymentModal(false);
                    handleCreateJob(pid);
                }}
                onPaymentError={() => {
                    // Toast already handled in modal usually, but we can double up
                }}
                bookingDetails={{
                    passengerEmail,
                    tenantId: 'demo-taxis' // Should be dynamic
                }}
            />
        </div>
    );
}

