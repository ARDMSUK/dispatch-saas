'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Navigation, User, Zap, Plane, Plus, X, RotateCw, MapPin, Phone, CreditCard, Banknote, Building2, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { LocationInput } from './location-input';
import { PaymentModal } from './payment-modal';

type BookingFormProps = {
    onJobCreated: () => void;
};

import { format, addMinutes, addHours, addDays, setHours, setMinutes } from 'date-fns';

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
    const router = useRouter();

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
        const phoneParam = searchParams.get('phone') || searchParams.get('cli') || searchParams.get('caller_id');
        const nameParam = searchParams.get('name');

        let shouldCleanUrl = false;

        if (phoneParam) {
            const decodedPhone = decodeURIComponent(phoneParam);
            setPassengerPhone(decodedPhone);
            handlePhoneLookup(decodedPhone);
            shouldCleanUrl = true;
        }

        if (nameParam) {
            setPassengerName(decodeURIComponent(nameParam));
            shouldCleanUrl = true;
        }

        if (shouldCleanUrl) {
            // Strip the query parameters from the URL silently without reloading the page
            const newParams = new URLSearchParams(searchParams.toString());
            newParams.delete('phone');
            newParams.delete('cli');
            newParams.delete('caller_id');
            newParams.delete('name');

            const newSearch = newParams.toString();
            const newUrl = window.location.pathname + (newSearch ? '?' + newSearch : '');
            router.replace(newUrl, { scroll: false });
        }
    }, [searchParams, router]);

    useEffect(() => {
        fetch('/api/accounts')
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) setAccounts(data);
            })
            .catch(err => console.error(err));

        fetch('/api/settings/organization')
            .then(res => res.json())
            .then(data => {
                // Ignore organization default autoDispatch as we want it to always default to false (unchecked) for the operator console
            })
            .catch(err => console.error("Error loading auto-dispatch default:", err));
    }, []);

    // Timing
    const [pickupTime, setPickupTime] = useState(() => {
        return format(addMinutes(new Date(), 10), "yyyy-MM-dd'T'HH:mm");
    });

    const timeInputRef = useRef<HTMLInputElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    const [pickupDate, pickupTimeOnly] = pickupTime.includes('T')
        ? pickupTime.split('T')
        : [pickupTime, '12:00'];

    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newDate = e.target.value || format(new Date(), 'yyyy-MM-dd');
        setPickupTime(`${newDate}T${pickupTimeOnly}`);
    };

    const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newTime = e.target.value || '12:00';
        setPickupTime(`${pickupDate}T${newTime}`);
    };

    const getPickupDayName = () => {
        if (!pickupDate) return '';
        try {
            const dateStr = pickupDate.includes('-') ? pickupDate : format(new Date(), 'yyyy-MM-dd');
            const parts = dateStr.split('-');
            const date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
            return format(date, "EEE dd");
        } catch (e) {
            return '';
        }
    };

    useEffect(() => {
        if (timeInputRef.current) {
            timeInputRef.current.focus();
        }
    }, []);

    // Return Booking
    const [isReturn, setIsReturn] = useState(false);
    const [returnDate, setReturnDate] = useState('');

    const returnDateOnly = returnDate.includes('T') ? returnDate.split('T')[0] : returnDate;
    const returnTimeOnly = returnDate.includes('T') ? returnDate.split('T')[1] : '12:00';

    const handleReturnDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newDate = e.target.value || format(new Date(), 'yyyy-MM-dd');
        setReturnDate(`${newDate}T${returnTimeOnly}`);
    };

    const handleReturnTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newTime = e.target.value || '12:00';
        setReturnDate(`${returnDateOnly}T${newTime}`);
    };

    const getReturnDayName = () => {
        if (!returnDateOnly) return '';
        try {
            const dateStr = returnDateOnly.includes('-') ? returnDateOnly : format(new Date(), 'yyyy-MM-dd');
            const parts = dateStr.split('-');
            const date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
            return format(date, "EEE dd");
        } catch (e) {
            return '';
        }
    };

    // Scroll handler for auto-hiding the quote badge
    const [showFloatingQuote, setShowFloatingQuote] = useState(true);

    useEffect(() => {
        const handleScroll = () => {
            if (scrollContainerRef.current) {
                const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
                if (scrollTop + clientHeight >= scrollHeight - 40) {
                    setShowFloatingQuote(false);
                } else {
                    setShowFloatingQuote(true);
                }
            }
        };

        const container = scrollContainerRef.current;
        if (container) {
            container.addEventListener('scroll', handleScroll, { passive: true });
            handleScroll();
        }
        return () => {
            if (container) {
                container.removeEventListener('scroll', handleScroll);
            }
        };
    }, []);
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
    const [autoDispatch, setAutoDispatch] = useState(false);

    // New Console States
    const [handLuggageOnly, setHandLuggageOnly] = useState(false);
    const [muteNotifications, setMuteNotifications] = useState(false);
    const [recurrenceInterval, setRecurrenceInterval] = useState(1);
    const [recurrenceDays, setRecurrenceDays] = useState<number[]>([]);
    const [recurrenceExclusions, setRecurrenceExclusions] = useState<string[]>([]);
    const [currentCalMonth, setCurrentCalMonth] = useState(() => new Date());


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

    const getPaymentIcon = () => {
        switch (paymentType) {
            case 'CASH':
                return <Banknote className="h-4 w-4" />;
            case 'CARD':
                return <CreditCard className="h-4 w-4" />;
            case 'ACCOUNT':
                return <Building2 className="h-4 w-4" />;
            default:
                return <CreditCard className="h-4 w-4" />;
        }
    };


    const [quotedPrice, setQuotedPrice] = useState<number | null>(null);
    const [isCalculating, setIsCalculating] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

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
        if (isCalculating) {
            toast.error("Price Calculating", { description: "Please wait a moment while the final price is calculated." });
            return;
        }

        if (!pickup) {
            toast.error("Pickup Address Required", { description: "Please select a pickup address to save the booking." });
            return;
        }

        if (!dropoff) {
            toast.error("Dropoff Address Required", { description: "Please select a destination address to save the booking." });
            return;
        }

        if (!passengerName) {
            toast.error("Passenger Name Required", { description: "Please enter the passenger's name to save the booking." });
            return;
        }

        if (!passengerPhone) {
            toast.error("Telephone Number Required", { description: "Please enter the passenger's telephone number to save the booking." });
            return;
        }

        // Validate Phone Format and Length (10 to 15 digits)
        const cleanPhoneDigits = passengerPhone.replace(/\D/g, '');
        const phoneCharRegex = /^\+?[0-9\s\-()]+$/;
        if (!phoneCharRegex.test(passengerPhone) || cleanPhoneDigits.length < 10 || cleanPhoneDigits.length > 15) {
            toast.error("Invalid Telephone Number", { 
                description: "Please enter a valid telephone number containing between 10 and 15 digits." 
            });
            return;
        }

        // Validate Email Format if Entered
        if (passengerEmail) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(passengerEmail)) {
                toast.error("Invalid Email Address", { 
                    description: "Please enter a valid email address (e.g. name@example.com) or leave the field blank." 
                });
                return;
            }
        }

        // Mandatory Flight Number Validation for Airports (Outbound)
        if (showFlightInput && !flightNumber) {
            toast.error("Flight Number Required", { description: "Please enter a flight number for airport transfers." });
            return;
        }

        // Mandatory Return Flight Number Validation if Return Pickup is an Airport
        if (isReturn && isAirport(returnPickup) && !returnFlightNumber) {
            toast.error("Return Flight Number Required", { description: "Please enter the return flight number for airport pickups." });
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
        if (isSaving) return;
        setIsSaving(true);
        try {
            // Compose Notes
            let combinedNotes = instructions;
            const prefixParts = [];
            if (reminders) prefixParts.push(`REMINDER: ${reminders}`);
            if (meetAndGreet) prefixParts.push(`MEET & GREET p/u`);
            if (handLuggageOnly) prefixParts.push(`HAND LUGGAGE ONLY`);
            if (muteNotifications) prefixParts.push(`NO_NOTIFICATIONS`);

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
                recurrenceEnd: isRecurring && recurrenceEnd ? recurrenceEnd : null,
                recurrenceInterval: isRecurring ? recurrenceInterval : 1,
                recurrenceDays: isRecurring ? recurrenceDays : [],
                recurrenceExclusions: isRecurring ? recurrenceExclusions : [],
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
        } finally {
            setIsSaving(false);
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
        setAutoDispatch(false);
        setHandLuggageOnly(false);
        setMuteNotifications(false);
        setRecurrenceInterval(1);
        setRecurrenceDays([]);
        setRecurrenceExclusions([]);
        setCurrentCalMonth(new Date());

        const now = new Date();
        now.setMinutes(now.getMinutes() + 10);
        setPickupTime(now.toISOString().slice(0, 16));

        // Re-focus the hour segment of the time input
        setTimeout(() => {
            if (timeInputRef.current) {
                timeInputRef.current.focus();
            }
        }, 50);
    };

    // ...

    const addVia = () => { setVias([...vias, { address: '' }]); };
    const removeVia = (index: number) => { const newVias = [...vias]; newVias.splice(index, 1); setVias(newVias); };
    const updateVia = (index: number, address: string, lat?: number, lng?: number) => { const newVias = [...vias]; newVias[index].address = address; if (lat) newVias[index].lat = lat; if (lng) newVias[index].lng = lng; setVias(newVias); };
    const isAirport = (address: string) => {
        if (!address) return false;
        const addrLower = address.toLowerCase();
        return addrLower.includes('terminal') ||
               addrLower.includes('airport') ||
               addrLower.includes('gatwick') ||
               addrLower.includes('heathrow') ||
               addrLower.includes('luton') ||
               addrLower.includes('stansted');
    }
    const showFlightInput = isAirport(pickup) || isAirport(dropoff);

    // Reset M&G if not airport
    useEffect(() => {
        if (!showFlightInput) setMeetAndGreet(false);
    }, [showFlightInput]);

    const [customerStats, setCustomerStats] = useState<{ total: number, lastDate: string } | null>(null);
    const [recentJobs, setRecentJobs] = useState<any[]>([]);
    const [phoneSearchOpen, setPhoneSearchOpen] = useState(false);

    // Debounce phone lookup when > 7 chars
    useEffect(() => {
        if (passengerPhone.length > 7) {
            const timer = setTimeout(() => {
                handlePhoneLookup(passengerPhone);
            }, 600);
            return () => clearTimeout(timer);
        } else {
            setPhoneSearchOpen(false);
            setRecentJobs([]);
            setCustomerStats(null);
        }
    }, [passengerPhone]);

    const handleSelectRecentJob = (job: any) => {
        if (job.pickup) setPickup(job.pickup);
        if (job.pickupLat && job.pickupLng) {
            setPickupCoords({ lat: job.pickupLat, lng: job.pickupLng });
        } else {
            setPickupCoords(null);
        }

        if (job.dropoff) setDropoff(job.dropoff);
        if (job.dropoffLat && job.dropoffLng) {
            setDropoffCoords({ lat: job.dropoffLat, lng: job.dropoffLng });
        } else {
            setDropoffCoords(null);
        }
        setPhoneSearchOpen(false);
    };
    // (Check for CLI / URL Phone Param effect was removed and merged into the top-level URL parser)

    const handlePhoneLookup = async (phoneVal: string) => {
        if (!phoneVal || phoneVal.length < 5) return;

        try {
            const res = await fetch(`/api/customers/lookup?phone=${encodeURIComponent(phoneVal)}`);
            if (res.ok) {
                const data = await res.json();
                if (data.found && data.customer) {
                    toast.success("Customer Found", { description: `Welcome back, ${data.customer.name || 'valued customer'}` });

                    // Auto-populate Details immediately (user can override)
                    if (data.customer.name) setPassengerName(data.customer.name);
                    if (data.customer.email) setPassengerEmail(data.customer.email);

                    // Show recent jobs if they exist instead of auto-populating
                    if (data.recentJobs && data.recentJobs.length > 0) {
                        setRecentJobs(data.recentJobs);
                        setPhoneSearchOpen(true);
                    } else {
                        setRecentJobs([]);
                        // Fall back to auto-populate if we just have one job and no recent array maybe? No, we rely on recentJobs now.
                        if (data.lastJob && (!data.recentJobs || data.recentJobs.length === 0)) {
                             // legacy fallback
                             handleSelectRecentJob(data.lastJob);
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

    const renderExclusionsCalendar = () => {
        const year = currentCalMonth.getFullYear();
        const month = currentCalMonth.getMonth();
        const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        const firstDay = new Date(year, month, 1).getDay();
        const startOffset = firstDay === 0 ? 6 : firstDay - 1;
        const totalDays = new Date(year, month + 1, 0).getDate();
        
        const days = [];
        for (let i = 0; i < startOffset; i++) {
            days.push(<div key={`empty-${i}`} className="h-8"></div>);
        }
        
        for (let day = 1; day <= totalDays; day++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const isExcluded = recurrenceExclusions.includes(dateStr);
            
            days.push(
                <button
                    key={`day-${day}`}
                    type="button"
                    onClick={() => {
                        if (isExcluded) {
                            setRecurrenceExclusions(recurrenceExclusions.filter(d => d !== dateStr));
                        } else {
                            setRecurrenceExclusions([...recurrenceExclusions, dateStr]);
                        }
                    }}
                    className={`h-8 w-8 text-xs rounded-full flex items-center justify-center font-medium transition-all ${
                        isExcluded 
                            ? 'bg-red-500 text-white font-bold hover:bg-red-600 line-through' 
                            : 'bg-slate-100 text-slate-800 hover:bg-slate-200'
                    }`}
                >
                    {day}
                </button>
            );
        }
        
        return (
            <div className="p-3 bg-white border border-slate-200 rounded-lg shadow-sm">
                <div className="flex justify-between items-center mb-3">
                    <span className="text-sm font-bold text-slate-900">{monthNames[month]} {year}</span>
                    <div className="flex gap-1">
                        <Button 
                            type="button" 
                            variant="outline" 
                            size="icon" 
                            className="h-6 w-6" 
                            onClick={() => setCurrentCalMonth(new Date(year, month - 1, 1))}
                        >
                            &lt;
                        </Button>
                        <Button 
                            type="button" 
                            variant="outline" 
                            size="icon" 
                            className="h-6 w-6" 
                            onClick={() => setCurrentCalMonth(new Date(year, month + 1, 1))}
                        >
                            &gt;
                        </Button>
                    </div>
                </div>
                <div className="grid grid-cols-7 gap-1 text-center font-semibold text-[10px] text-slate-400 mb-1">
                    <span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span><span>S</span>
                </div>
                <div className="grid grid-cols-7 gap-1">
                    {days}
                </div>
            </div>
        );
    };

    return (
        <div className="flex flex-col gap-5 h-full relative">
            {/* Header ... */}
            <div>
                {/* Header Cleaned */}
                <h1 className="text-2xl font-bold text-slate-900">Booking Console</h1>
            </div>

            <div ref={scrollContainerRef} className="flex-1 overflow-y-auto pr-2 space-y-4 custom-scrollbar">
                {/* 1. PICKUP TIME */}
                <div className="space-y-3">
                    <label className="text-xs font-bold text-black uppercase tracking-wider">
                        Pickup Date & Time {getPickupDayName() && `(${getPickupDayName()})`}
                    </label>
                    <div className="flex gap-2">
                        <input
                            type="date"
                            className="flex-1 bg-slate-100 border border-slate-200 rounded-md py-2.5 px-3 text-sm text-black font-bold focus:outline-none focus:border-blue-500/50 [color-scheme:light]"
                            value={pickupDate}
                            onChange={handleDateChange}
                        />
                        <input
                            type="time"
                            ref={timeInputRef}
                            className="w-32 bg-slate-100 border border-slate-200 rounded-md py-2.5 px-3 text-sm text-black focus:outline-none focus:border-blue-500/50 [color-scheme:light]"
                            value={pickupTimeOnly}
                            onChange={handleTimeChange}
                        />
                        <Button
                            variant="outline"
                            className={`h-[42px] px-3 border-slate-200 transition-all ${pickupTime.includes('T') ? 'bg-black text-white border-black hover:bg-black/90' : 'bg-slate-100 text-black hover:bg-slate-200'}`}
                            onClick={() => setPickupTime(format(addMinutes(new Date(), 10), "yyyy-MM-dd'T'HH:mm"))}
                        >
                            ASAP
                        </Button>
                    </div>
                </div>

                {/* 2. CUSTOMER PHONE */}
                <div className="space-y-3 p-3 bg-slate-100 border border-slate-200 rounded-lg">
                    <div className="flex justify-between items-end">
                        <label className="text-xs font-bold text-black uppercase tracking-wider flex items-center gap-2">
                            <Phone className="h-3 w-3 text-black" /> Telephone
                        </label>
                        {customerStats && (
                            <div className="text-[10px] text-right">
                                <span className="block text-emerald-600 font-bold">{customerStats.total} Previous Jobs</span>
                                <span className="block text-slate-400">Last: {new Date(customerStats.lastDate).toLocaleDateString()}</span>
                            </div>
                        )}
                    </div>
                    <div className="relative">
                        <input
                            type="tel"
                            placeholder=""
                            className="w-full bg-slate-100 border border-slate-200 rounded-md py-2.5 px-3 text-lg font-mono text-black focus:outline-none focus:border-blue-500/50"
                            value={passengerPhone}
                            onChange={e => setPassengerPhone(e.target.value)}
                        />
                        {phoneSearchOpen && recentJobs.length > 0 && (
                            <div className="absolute top-[calc(100%+4px)] left-0 w-full z-[10000] bg-slate-100 border border-blue-500/30 shadow-2xl rounded-md overflow-hidden max-h-80 overflow-y-auto">
                                <div className="px-2 py-1.5 text-xs font-semibold text-indigo-600 bg-blue-50/50 border-b border-blue-100 uppercase flex justify-between items-center">
                                    <span>Recent Jobs (Click to populate)</span>
                                    <button onClick={() => setPhoneSearchOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="h-3 w-3" /></button>
                                </div>
                                <div className="p-1 space-y-1">
                                    {recentJobs.map((job, idx) => (
                                        <div 
                                            key={job.id || idx} 
                                            className="p-2 bg-white hover:bg-blue-50 cursor-pointer rounded border border-slate-100 transition-colors"
                                            onClick={() => handleSelectRecentJob(job)}
                                        >
                                            <div className="flex justify-between items-start mb-1">
                                                <span className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1">
                                                    <Navigation className="h-3 w-3 text-emerald-500" /> Pickup
                                                </span>
                                                <span className="text-[10px] text-slate-400">
                                                    {new Date(job.date).toLocaleDateString()}
                                                </span>
                                            </div>
                                            <div className="text-xs text-slate-800 font-medium truncate pl-4 mb-2 border-l-2 border-emerald-500/20">{job.pickup || 'Unknown'}</div>
                                            
                                            <span className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1 mb-1">
                                                <MapPin className="h-3 w-3 text-blue-500" /> Dropoff
                                            </span>
                                            <div className="text-xs text-slate-800 font-medium truncate pl-4 border-l-2 border-blue-500/20">{job.dropoff || 'Unknown'}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="border-t border-slate-200 my-4"></div>

                {/* 2. ROUTE */}
                <div className="space-y-3">
                    {/* Pickup */}
                    <div className="flex items-center gap-2">
                        <label className="text-sm font-semibold text-slate-900 w-24 shrink-0">Pickup:</label>
                        <div className="relative flex-1 group z-50">
                            <LocationInput placeholder="" className="w-full bg-slate-100 border border-slate-200 rounded-md py-2.5 pl-9 pr-4 text-sm text-slate-900 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all placeholder:text-zinc-600" value={pickup} onChange={(val) => { setPickup(val); setPickupCoords(null); setQuotedPrice(null); }} onLocationSelect={(loc) => { setPickup(loc.address); setPickupCoords({ lat: loc.lat, lng: loc.lng }); }} />
                            <div className="absolute left-3 top-3 text-slate-400 pointer-events-none z-10"><Navigation className="h-4 w-4" /></div>
                        </div>
                    </div>
                    {/* Vias */}
                    {vias.map((via, index) => (
                        <div key={index} className="flex items-center gap-2">
                            <div className="w-16 shrink-0"></div>
                            <div className="relative flex-1 group flex gap-2">
                                <div className="relative flex-1">
                                    <LocationInput placeholder={`Via #${index + 1}`} className="w-full bg-slate-100 border border-slate-200 rounded-md py-2.5 pl-9 pr-4 text-sm text-slate-900 focus:outline-none focus:border-blue-500/50" value={via.address} onChange={(val) => updateVia(index, val)} onLocationSelect={(loc) => { updateVia(index, loc.address, loc.lat, loc.lng); }} />
                                    <div className="absolute left-3 top-3 text-slate-400 pointer-events-none z-10"><MapPin className="h-4 w-4" /></div>
                                </div>
                                <Button size="icon" variant="ghost" className="text-red-500 hover:text-red-400 hover:bg-slate-200" onClick={() => removeVia(index)}><X className="h-4 w-4" /></Button>
                            </div>
                        </div>
                    ))}
                    <div className="flex items-center gap-2">
                        <div className="w-16 shrink-0"></div>
                        <button onClick={addVia} className="text-xs text-black hover:text-black/80 flex items-center gap-1 font-medium"><Plus className="h-3 w-3 text-black" /> Add Stop / Via</button>
                    </div>
                    {/* Dest */}
                    <div className="flex items-center gap-2">
                        <label className="text-sm font-semibold text-slate-900 w-24 shrink-0">Dest:</label>
                        <div className="relative flex-1 group z-40">
                            <LocationInput placeholder="" className="w-full bg-slate-100 border border-slate-200 rounded-md py-2.5 pl-9 pr-4 text-sm text-slate-900 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all placeholder:text-zinc-600" value={dropoff} onChange={(val) => { setDropoff(val); setDropoffCoords(null); setQuotedPrice(null); }} onLocationSelect={(loc) => { setDropoff(loc.address); setDropoffCoords({ lat: loc.lat, lng: loc.lng }); setTimeout(() => handleCalculate(), 100); }} />
                            <div className="absolute left-3 top-3 text-slate-400 pointer-events-none z-10"><MapPin className="h-4 w-4" /></div>
                        </div>
                    </div>
                    {/* Flight */}
                    {showFlightInput && (
                        <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                            <div className="relative group">
                                <div className="absolute left-3 top-3 text-blue-500"><Plane className="h-4 w-4" /></div>
                                <input type="text" placeholder="Flight Number (e.g. BA101)" className="w-full bg-blue-500/10 border border-blue-500/30 rounded-md py-2.5 pl-10 pr-4 text-sm text-slate-900 focus:outline-none focus:border-blue-400/50" value={flightNumber} onChange={e => setFlightNumber(e.target.value.toUpperCase())} />
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                {/* Meet & Greet Toggle */}
                                <div className="flex items-center gap-2.5 p-2 rounded border border-blue-500/30 bg-blue-500/10">
                                    <input
                                        type="checkbox"
                                        id="mgToggle"
                                        checked={meetAndGreet}
                                        onChange={(e) => setMeetAndGreet(e.target.checked)}
                                        className="w-4 h-4 rounded border-blue-500 text-blue-500 focus:ring-blue-500/20"
                                    />
                                    <label htmlFor="mgToggle" className="text-xs text-blue-900 font-semibold flex-1 cursor-pointer select-none">
                                        Meet & Greet?
                                    </label>
                                </div>

                                {/* Hand Luggage Only Toggle */}
                                <div className="flex items-center gap-2.5 p-2 rounded border border-teal-500/30 bg-teal-500/5">
                                    <input
                                        type="checkbox"
                                        id="hloToggle"
                                        checked={handLuggageOnly}
                                        onChange={(e) => setHandLuggageOnly(e.target.checked)}
                                        className="w-4 h-4 rounded border-teal-500 text-teal-500 focus:ring-teal-500/20"
                                    />
                                    <label htmlFor="hloToggle" className="text-xs text-teal-900 font-semibold flex-1 cursor-pointer select-none">
                                        Hand Luggage?
                                    </label>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="border-t border-slate-200 my-4"></div>

                {/* 3. DETAILS SECTION */}
                <div className="space-y-3">
                    <div className="flex items-center gap-2">
                        <label className="text-sm font-semibold text-slate-900 w-24 shrink-0">Name:</label>
                        <div className="relative flex-1">
                            <div className="absolute left-3 top-3 text-slate-400">
                                <User className="h-4 w-4" />
                            </div>
                            <input
                                type="text"
                                placeholder=""
                                className="w-full bg-slate-100 border border-slate-200 rounded-md py-2.5 pl-10 pr-2 text-sm text-slate-900 focus:outline-none focus:border-blue-500/50"
                                value={passengerName}
                                onChange={e => setPassengerName(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* EMAIL FIELD */}
                    <div className="flex items-center gap-2">
                        <label className="text-sm font-semibold text-slate-900 w-24 shrink-0">Email:</label>
                        <div className="relative flex-1">
                            <div className="absolute left-3 top-3 text-slate-400">
                                <span className="text-xs font-bold">@</span>
                            </div>
                            <input
                                type="email"
                                placeholder=""
                                className="w-full bg-slate-100 border border-slate-200 rounded-md py-2.5 pl-10 pr-2 text-sm text-slate-900 focus:outline-none focus:border-blue-500/50"
                                value={passengerEmail}
                                onChange={e => setPassengerEmail(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* PAX, LUG, VEH on the same line */}
                    <div className="flex items-center gap-3 pl-6 md:pl-24">
                        {/* PAX */}
                        <div className="flex items-center gap-1.5 shrink-0">
                            <label className="text-xs font-bold text-slate-900">PAX:</label>
                            <select
                                className="w-16 bg-slate-100 border border-slate-200 rounded-md py-2 px-1 text-center text-sm text-slate-900 focus:outline-none focus:border-blue-500/50"
                                value={passengers}
                                onChange={e => setPassengers(parseInt(e.target.value))}
                            >
                                {Array.from({ length: 50 }, (_, i) => i + 1).map(num => (
                                    <option key={num} value={num}>{num}</option>
                                ))}
                            </select>
                        </div>

                        {/* LUG */}
                        <div className="flex items-center gap-1.5 shrink-0">
                            <label className="text-xs font-bold text-slate-900">LUG:</label>
                            <select
                                className="w-16 bg-slate-100 border border-slate-200 rounded-md py-2 px-1 text-center text-sm text-slate-900 focus:outline-none focus:border-blue-500/50"
                                value={luggage}
                                onChange={e => setLuggage(parseInt(e.target.value))}
                            >
                                {Array.from({ length: 51 }, (_, i) => i).map(num => (
                                    <option key={num} value={num}>{num}</option>
                                ))}
                            </select>
                        </div>

                        {/* Veh */}
                        <div className="flex items-center gap-1.5 flex-1 min-w-0">
                            <label className="text-xs font-bold text-slate-900 shrink-0">VEH:</label>
                            <select
                                className="w-full bg-slate-100 border border-slate-200 rounded-md py-2 px-2 text-sm text-slate-900 focus:outline-none focus:border-blue-500/50 appearance-none"
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
                                <option value="WAV MPV">WAV MPV</option>
                                <option value="WAV Minibus">WAV Minibus</option>
                                <option value="Minibus">Minibus</option>
                                <option value="Coach">Coach</option>
                            </select>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <label className="text-sm font-semibold text-slate-900 w-24 shrink-0 leading-tight">Payment:</label>
                        <div className="relative flex-1">
                            <div className="absolute left-3 top-3 text-slate-400 pointer-events-none z-10">
                                {getPaymentIcon()}
                            </div>
                            <select
                                className="w-full bg-slate-100 border border-slate-200 rounded-md py-2.5 pl-10 pr-3 text-sm text-slate-900 font-bold focus:outline-none focus:border-blue-500/50 appearance-none"
                                value={paymentType}
                                onChange={e => setPaymentType(e.target.value)}
                            >
                                <option value="CASH">CASH PAYMENT</option>
                                <option value="CARD">CARD / PRE-PAID</option>
                                <option value="ACCOUNT">ACCOUNT (INVOICE)</option>
                            </select>
                        </div>
                    </div>

                    {/* ACCOUNT SELECTION (Moved to bottom of payment field and styled to match) */}
                    {paymentType === 'ACCOUNT' && (
                        <div className="flex items-center gap-2 animate-in fade-in slide-in-from-top-1">
                            <div className="w-24 shrink-0"></div>
                            <div className="relative flex-1">
                                <div className="absolute left-3 top-3 text-slate-400 pointer-events-none z-10">
                                    <Building2 className="h-4 w-4" />
                                </div>
                                <select
                                    className="w-full bg-slate-100 border border-slate-200 rounded-md py-2.5 pl-10 pr-3 text-sm text-slate-900 font-bold focus:outline-none focus:border-blue-500/50 appearance-none"
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
                        </div>
                    )}

                </div>

                <div className="border-t border-slate-200 my-4"></div>

                <div className="border-t border-slate-200 my-4"></div>

                {/* 4. RETURN & DETAILS/SCHEDULING OPTIONS */}
                <div className="space-y-3">
                    
                    {/* RETURN & OTHER OPTIONS (Segmented buttons with AI gradient text on black active background) */}
                    <div className="flex items-center gap-2 w-full mt-2">
                        <button
                            type="button"
                            onClick={() => {
                                const nextVal = !isReturn;
                                setIsReturn(nextVal);
                                if (nextVal) {
                                    setIsWaitAndReturn(false);
                                    setReturnPickup(dropoff);
                                    setReturnPickupCoords(dropoffCoords);
                                    setReturnDropoff(pickup);
                                    setReturnDropoffCoords(pickupCoords);
                                    setReturnPassengers(passengers);
                                    setReturnLuggage(luggage);
                                    if (pickupTime) {
                                        const defaultReturn = addHours(new Date(pickupTime), 2);
                                        setReturnDate(format(defaultReturn, "yyyy-MM-dd'T'HH:mm"));
                                    }
                                }
                            }}
                            className={`flex-1 py-2.5 px-2 rounded-md text-xs font-bold transition-all duration-200 text-center ${
                                isReturn 
                                    ? 'bg-black border border-black shadow-sm text-transparent' 
                                    : (pickup !== '' && dropoff !== '' && passengerPhone !== '' && !isReturn)
                                        ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-purple-500/60 ring-2 ring-purple-500/40 animate-pulse shadow-[0_0_10px_rgba(168,85,247,0.3)]'
                                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                            }`}
                        >
                            {isReturn ? (
                                <span className="bg-gradient-to-r from-violet-300 via-fuchsia-300 to-cyan-300 bg-clip-text text-transparent">
                                    Return
                                </span>
                            ) : (
                                "Return"
                            )}
                        </button>

                        <button
                            type="button"
                            onClick={() => {
                                const nextVal = !isWaitAndReturn;
                                setIsWaitAndReturn(nextVal);
                                if (nextVal) {
                                    setIsReturn(false);
                                }
                            }}
                            className={`flex-1 py-2.5 px-2 rounded-md text-xs font-bold transition-all duration-200 text-center ${
                                isWaitAndReturn 
                                    ? 'bg-black border border-black shadow-sm text-transparent' 
                                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                            }`}
                        >
                            {isWaitAndReturn ? (
                                <span className="bg-gradient-to-r from-violet-300 via-fuchsia-300 to-cyan-300 bg-clip-text text-transparent">
                                    W & R
                                </span>
                            ) : (
                                "W & R"
                            )}
                        </button>

                        <button
                            type="button"
                            onClick={() => setIsRecurring(!isRecurring)}
                            className={`flex-1 py-2.5 px-2 rounded-md text-xs font-bold transition-all duration-200 text-center ${
                                isRecurring 
                                    ? 'bg-black border border-black shadow-sm text-transparent' 
                                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                            }`}
                        >
                            {isRecurring ? (
                                <span className="bg-gradient-to-r from-violet-300 via-fuchsia-300 to-cyan-300 bg-clip-text text-transparent">
                                    Recurring
                                </span>
                            ) : (
                                "Recurring"
                            )}
                        </button>

                        <button
                            type="button"
                            onClick={() => setMuteNotifications(!muteNotifications)}
                            className={`flex-1 py-2.5 px-2 rounded-md text-xs font-bold transition-all duration-200 text-center ${
                                muteNotifications 
                                    ? 'bg-black border border-black shadow-sm text-transparent' 
                                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                            }`}
                        >
                            {muteNotifications ? (
                                <span className="bg-gradient-to-r from-violet-300 via-fuchsia-300 to-cyan-300 bg-clip-text text-transparent">
                                    Mute SMS
                                </span>
                            ) : (
                                "Mute SMS"
                            )}
                        </button>
                    </div>

                    {isReturn && (
                        <div className="pl-4 border-l-2 border-indigo-600/20 animate-in slide-in-from-top-2 space-y-4 mt-4">
                            {/* RETURN DATE/TIME (Moved to the top) */}
                            <div className="space-y-3">
                                <label className="text-xs font-bold text-black uppercase tracking-wider">
                                    Return Date & Time {getReturnDayName() && `(${getReturnDayName()})`}
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        type="date"
                                        className="flex-1 bg-slate-100 border border-slate-200 rounded-md py-2.5 px-3 text-sm text-black focus:outline-none focus:border-blue-500/50 [color-scheme:light]"
                                        value={returnDateOnly}
                                        onChange={handleReturnDateChange}
                                    />
                                    <input
                                        type="time"
                                        className="w-32 bg-slate-100 border border-slate-200 rounded-md py-2.5 px-3 text-sm text-black focus:outline-none focus:border-blue-500/50 [color-scheme:light]"
                                        value={returnTimeOnly}
                                        onChange={handleReturnTimeChange}
                                    />
                                </div>
                            </div>

                            {/* RETURN PICKUP */}
                            <div className="flex items-center gap-2">
                                <label className="text-sm font-semibold text-slate-900 w-24 shrink-0">Pickup:</label>
                                <div className="relative flex-1 group z-30">
                                    <LocationInput
                                        placeholder=""
                                        className="w-full bg-slate-100 border border-slate-200 rounded-md py-2.5 pl-9 pr-4 text-sm text-slate-900 focus:outline-none focus:border-blue-500/50"
                                        value={returnPickup}
                                        onChange={setReturnPickup}
                                        onLocationSelect={(loc) => {
                                            setReturnPickup(loc.address);
                                            setReturnPickupCoords({ lat: loc.lat, lng: loc.lng });
                                        }}
                                    />
                                    <div className="absolute left-3 top-3 text-slate-400 pointer-events-none z-10"><Navigation className="h-4 w-4" /></div>
                                </div>
                            </div>

                            {/* RETURN DROPOFF */}
                            <div className="flex items-center gap-2">
                                <label className="text-sm font-semibold text-slate-900 w-24 shrink-0">Dest:</label>
                                <div className="relative flex-1 group z-20">
                                    <LocationInput
                                        placeholder=""
                                        className="w-full bg-slate-100 border border-slate-200 rounded-md py-2.5 pl-9 pr-4 text-sm text-slate-900 focus:outline-none focus:border-blue-500/50"
                                        value={returnDropoff}
                                        onChange={setReturnDropoff}
                                        onLocationSelect={(loc) => {
                                            setReturnDropoff(loc.address);
                                            setReturnDropoffCoords({ lat: loc.lat, lng: loc.lng });
                                        }}
                                    />
                                    <div className="absolute left-3 top-3 text-slate-400 pointer-events-none z-10"><MapPin className="h-4 w-4" /></div>
                                </div>
                            </div>

                            {/* RETURN FLIGHT (Only visible if pickup is airport) */}
                            {isAirport(returnPickup) && (
                                <div className="relative group animate-in fade-in slide-in-from-top-2">
                                    <div className="absolute left-3 top-3 text-blue-500">
                                        <Plane className="h-4 w-4" />
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="Flight Number (e.g. BA101) *"
                                        className="w-full bg-blue-500/10 border border-blue-500/30 rounded-md py-2.5 pl-10 pr-4 text-sm text-slate-900 focus:outline-none focus:border-blue-400/50 font-bold"
                                        value={returnFlightNumber}
                                        onChange={e => setReturnFlightNumber(e.target.value.toUpperCase())}
                                    />
                                </div>
                            )}

                            {/* RETURN PAX & LUGGAGE on a single line matching main journey */}
                            <div className="flex items-center gap-3 pl-6 md:pl-24">
                                {/* PAX */}
                                <div className="flex items-center gap-1.5 shrink-0">
                                    <label className="text-xs font-bold text-slate-900">PAX:</label>
                                    <select
                                        className="w-16 bg-slate-100 border border-slate-200 rounded-md py-2 px-1 text-center text-sm text-slate-900 focus:outline-none focus:border-blue-500/50"
                                        value={returnPassengers}
                                        onChange={e => setReturnPassengers(parseInt(e.target.value))}
                                    >
                                        {Array.from({ length: 50 }, (_, i) => i + 1).map(num => (
                                            <option key={num} value={num}>{num}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* LUG */}
                                <div className="flex items-center gap-1.5 shrink-0">
                                    <label className="text-xs font-bold text-slate-900">LUG:</label>
                                    <select
                                        className="w-16 bg-slate-100 border border-slate-200 rounded-md py-2 px-1 text-center text-sm text-slate-900 focus:outline-none focus:border-blue-500/50"
                                        value={returnLuggage}
                                        onChange={e => setReturnLuggage(parseInt(e.target.value))}
                                    >
                                        {Array.from({ length: 51 }, (_, i) => i).map(num => (
                                            <option key={num} value={num}>{num}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* RETURN NOTES (Labeled Notes row) */}
                            <div className="flex items-center gap-2">
                                <label className="text-sm font-semibold text-slate-900 w-24 shrink-0">Notes:</label>
                                <input
                                    type="text"
                                    placeholder="Return journey notes..."
                                    className="w-full bg-slate-100 border border-slate-200 rounded-md py-2.5 px-3 text-sm text-slate-900 focus:outline-none focus:border-blue-500/50"
                                    value={returnNotes}
                                    onChange={e => setReturnNotes(e.target.value)}
                                />
                            </div>
                        </div>
                    )}

                    {isWaitAndReturn && (
                        <div className="pl-4 border-l-2 border-indigo-600/20 animate-in slide-in-from-top-2 space-y-4 mt-2 mb-4">
                            <div className="space-y-2">
                                <label className="text-xs text-blue-500 font-bold">Waiting Time (Minutes)</label>
                                <input
                                    type="number"
                                    min="0"
                                    step="5"
                                    className="w-full bg-slate-100 border border-slate-200 rounded-md py-2.5 px-3 text-sm text-slate-900 focus:outline-none focus:border-blue-500/50"
                                    value={waitingTime}
                                    onChange={e => setWaitingTime(parseInt(e.target.value))}
                                />
                            </div>
                        </div>
                    )}

                    {/* REMINDERS (Aligned with Payment/Email/Name with label on left and matching light-gray background) */}
                    <div className="flex items-center gap-2">
                        <label className="text-sm font-semibold text-black w-24 shrink-0 leading-tight">Reminders:</label>
                        <div className="relative flex-1">
                            <div className="absolute left-3 top-3 text-slate-400 pointer-events-none z-10">
                                <Bell className="h-4 w-4" />
                            </div>
                            <select
                                className="w-full bg-slate-100 border border-slate-200 rounded-md py-2.5 pl-10 pr-3 text-sm text-slate-900 font-bold focus:outline-none focus:border-blue-500/50 appearance-none"
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
                    </div>

                    {isRecurring && (
                        <div className="pl-4 border-l-2 border-slate-200 animate-in slide-in-from-top-2 space-y-4 mt-2">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs text-black font-bold block mb-1">Recurs</label>
                                    <select
                                        className="w-full bg-slate-100 border border-slate-200 rounded-md py-2 px-3 text-sm text-slate-900 focus:outline-none focus:border-blue-500/50"
                                        value={recurrenceRule}
                                        onChange={(e) => {
                                            setRecurrenceRule(e.target.value);
                                            setRecurrenceDays([]);
                                        }}
                                    >
                                        <option value="DAILY">Daily</option>
                                        <option value="WEEKLY">Weekly</option>
                                        <option value="WEEKDAYS">Weekdays</option>
                                        <option value="WEEKENDS">Weekends</option>
                                        <option value="MONTHLY">Monthly</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs text-black font-bold block mb-1">Recurs every</label>
                                    <div className="flex items-center gap-1.5">
                                        <input
                                            type="number"
                                            min="1"
                                            className="w-16 bg-slate-100 border border-slate-200 rounded-md py-2 px-2 text-sm text-slate-900 focus:outline-none focus:border-blue-500/50 text-center"
                                            value={recurrenceInterval}
                                            onChange={e => setRecurrenceInterval(parseInt(e.target.value) || 1)}
                                        />
                                        <span className="text-xs text-slate-500 font-semibold">
                                            {recurrenceRule === 'DAILY' ? 'days' : recurrenceRule === 'WEEKLY' ? 'weeks' : 'months'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {recurrenceRule === 'WEEKLY' && (
                                <div className="space-y-2">
                                    <label className="text-xs text-black font-bold block">Recurs on</label>
                                    <div className="flex gap-1.5 justify-between">
                                        {[
                                            { label: 'M', value: 1 },
                                            { label: 'T', value: 2 },
                                            { label: 'W', value: 3 },
                                            { label: 'T', value: 4 },
                                            { label: 'F', value: 5 },
                                            { label: 'S', value: 6 },
                                            { label: 'S', value: 0 }
                                        ].map(day => {
                                            const active = recurrenceDays.includes(day.value);
                                            return (
                                                <button
                                                    key={day.value}
                                                    type="button"
                                                    onClick={() => {
                                                        if (active) {
                                                            setRecurrenceDays(recurrenceDays.filter(d => d !== day.value));
                                                        } else {
                                                            setRecurrenceDays([...recurrenceDays, day.value]);
                                                        }
                                                    }}
                                                    className={`w-8 h-8 rounded-full text-xs font-bold transition-all ${
                                                        active 
                                                            ? 'bg-black text-white shadow' 
                                                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                                    }`}
                                                >
                                                    {day.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-1 gap-3">
                                <label className="text-xs text-black font-bold block">Repeat Until (Optional)</label>
                                <input
                                    type="date"
                                    className="w-full bg-slate-100 border border-slate-200 rounded-md py-2.5 px-3 text-sm text-slate-900 focus:outline-none focus:border-blue-500/50 [color-scheme:light]"
                                    value={recurrenceEnd}
                                    onChange={e => setRecurrenceEnd(e.target.value)}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs text-black font-bold block">Calendar Exclusions (Click to toggle)</label>
                                {renderExclusionsCalendar()}
                                {recurrenceExclusions.length > 0 && (
                                    <div className="text-[10px] text-red-600 font-semibold bg-red-50 p-2 rounded border border-red-200">
                                        Excluded dates: {recurrenceExclusions.sort().join(', ')}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* INSTRUCTIONS (Notes) */}
                    <div className="flex items-start gap-2">
                        <label className="text-sm font-semibold text-black w-24 shrink-0 mt-2.5 leading-tight">Instructions:</label>
                        <textarea
                            placeholder="Instructions (Notes)..."
                            rows={2}
                            className="flex-1 bg-slate-100 border border-slate-200 rounded-md py-2.5 px-3 text-sm text-slate-900 focus:outline-none focus:border-blue-500/50 resize-none"
                            value={instructions}
                            onChange={e => setInstructions(e.target.value)}
                        />
                    </div>
                    {/* Estimated Fare & Action Buttons (styled with Magenta/Cyan/Purple AI theme) */}
                </div>

                {/* QUOTE & SUBMIT */}
                <div className="mt-6 p-4 rounded-lg border border-black bg-black shadow-md text-white">
                    <div className="flex justify-between items-center">
                        <span className="text-xs uppercase tracking-wider font-bold text-slate-300">Estimated Fare</span>
                        {isCalculating ? (
                            <span className="text-cyan-400 text-xs animate-pulse font-semibold">Calculating...</span>
                        ) : (
                            <div className="flex flex-col items-end">
                                <div className="flex items-center justify-end group" title="Click to manually override fare">
                                    <span className="text-2xl font-mono text-white">£</span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        className="w-36 bg-transparent border-b border-dashed border-slate-700 hover:border-white focus:border-white text-2xl font-mono text-white text-right focus:outline-none transition-all ml-1 py-0 px-0"
                                        value={quotedPrice !== null ? quotedPrice : ''}
                                        onChange={(e) => setQuotedPrice(e.target.value ? parseFloat(e.target.value) : null)}
                                        placeholder="0.00"
                                    />
                                </div>
                                <span className="block text-[10px] text-slate-400 mt-1">
                                    {debugData?.payload?.distance ? `${debugData.payload.distance.toFixed(1)} miles` : '0.0 miles'}
                                </span>
                                {isReturn && quotedPrice !== null && (
                                    <span className="text-[10px] text-slate-400 block">+ £{quotedPrice.toFixed(2)} Return Est.</span>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <Button
                    className="w-full bg-black hover:bg-black/90 text-transparent font-extrabold h-12 text-md shadow-[0_4px_15px_rgba(0,0,0,0.15)] transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] border border-black mt-4 rounded-md uppercase tracking-wider flex items-center justify-center"
                    onClick={handlePreSubmit}
                    disabled={isSaving}
                >
                    {isSaving ? (
                        <span className="text-white flex items-center gap-2 font-bold normal-case">
                            <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
                            Saving Booking...
                        </span>
                    ) : (
                        <span className="bg-gradient-to-r from-violet-300 via-fuchsia-300 to-cyan-300 bg-clip-text text-transparent">
                            {isReturn ? 'SAVE BOOKING + RETURN' : 'SAVE BOOKING'}
                        </span>
                    )}
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

            {/* Floating Live Quote Badge */}
            {quotedPrice !== null && showFloatingQuote && (
                <div 
                    onClick={() => {
                        if (scrollContainerRef.current) {
                            scrollContainerRef.current.scrollTo({
                                top: scrollContainerRef.current.scrollHeight,
                                behavior: 'smooth'
                            });
                        }
                    }}
                    className="absolute bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-3 duration-300 bg-black border border-slate-700 shadow-2xl rounded-full py-2.5 px-4 flex items-center gap-2 cursor-pointer hover:bg-slate-900 transition-all select-none hover:scale-105 active:scale-95"
                >
                    <span className="text-[10px] font-bold text-slate-200 uppercase tracking-wider">Live Quote</span>
                    <span className="text-base font-mono font-bold text-transparent bg-gradient-to-r from-violet-300 via-fuchsia-300 to-cyan-300 bg-clip-text">
                        £{quotedPrice.toFixed(2)}
                    </span>
                </div>
            )}
        </div>
    );
}
