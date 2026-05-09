"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Navigation2, CheckCircle2, MapPin, Flag, Calendar, Car, User, Phone, Plane, MessageSquare, ArrowRight, ArrowLeft, Mail, Briefcase, Users } from "lucide-react";
import usePlacesAutocomplete, { getGeocode, getLatLng } from "use-places-autocomplete";
import { motion, AnimatePresence } from "framer-motion";
import { useJsApiLoader } from "@react-google-maps/api";

export default function BookerPage() {
    const params = useParams();
    const slug = params.slug as string;

    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [bookingComplete, setBookingComplete] = useState(false);
    const [isEmbed, setIsEmbed] = useState(false);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const queryParams = new URLSearchParams(window.location.search);
            if (queryParams.get('embed') === 'true') {
                setIsEmbed(true);
            }
        }
    }, []);

    const [formData, setFormData] = useState({
        pickup: "",
        dropoff: "",
        pickupTime: "",
        vehicleType: "Saloon",
        passengerName: "",
        passengerEmail: "",
        passengerPhone: "",
        passengers: "1",
        luggage: "0",
        notes: "",
        flightNumber: "",
        paymentType: "CASH",
    });

    const [quote, setQuote] = useState<number | null>(null);
    const [pricingBreakdown, setPricingBreakdown] = useState<any>(null);

    // Branding State
    const [brandColor, setBrandColor] = useState('#3b82f6'); // Default Blue-500
    const [logoUrl, setLogoUrl] = useState('');
    const [companyName, setCompanyName] = useState('Book Your Ride');

    // Google Maps Autocomplete Hooks
    const pickupSearch = usePlacesAutocomplete({ 
        requestOptions: { componentRestrictions: { country: "gb" } },
        debounce: 300,
        initOnMount: false
    }) as any;
    
    const dropoffSearch = usePlacesAutocomplete({ 
        requestOptions: { componentRestrictions: { country: "gb" } },
        debounce: 300,
        initOnMount: false
    }) as any;

    const { isLoaded: isGoogleLoaded } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
        libraries: ["places", "geometry"] as any,
    });

    useEffect(() => {
        if (isGoogleLoaded) {
            pickupSearch.init();
            dropoffSearch.init();
        }
    }, [isGoogleLoaded]);

    useEffect(() => {
        const fetchTenantInfo = async () => {
            try {
                const res = await fetch(`/api/booker/${slug}/info`);
                const data = await res.json();
                if (res.ok) {
                    if (data.brandColor) setBrandColor(data.brandColor);
                    if (data.logoUrl) setLogoUrl(data.logoUrl);
                    if (data.name) setCompanyName(data.name);
                }
            } catch (e) {
                console.error("Failed to fetch tenant branding");
            }
        };
        fetchTenantInfo();
    }, [slug]);

    // Step 1: Get Quote
    const handleGetQuote = async () => {
        if (!formData.pickup || !formData.dropoff || !formData.pickupTime) {
            toast.error("Please fill in pickup, dropoff, and time.");
            return;
        }

        setLoading(true);
        try {
            // Geocode
            let pLat, pLng, dLat, dLng;
            try {
                const pGeo = await getGeocode({ address: formData.pickup });
                if (pGeo && pGeo.length > 0) {
                    const { lat: plt, lng: plg } = await getLatLng(pGeo[0]);
                    pLat = plt; pLng = plg;
                }

                const dGeo = await getGeocode({ address: formData.dropoff });
                if (dGeo && dGeo.length > 0) {
                    const { lat: dlt, lng: dlg } = await getLatLng(dGeo[0]);
                    dLat = dlt; dLng = dlg;
                }
            } catch (e) {
                console.warn("Client geocoding failed, falling back to server...", e);
            }

            const res = await fetch(`/api/booker/${slug}/quote`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    pickup: formData.pickup,
                    dropoff: formData.dropoff,
                    pickupLat: pLat, pickupLng: pLng,
                    dropoffLat: dLat, dropoffLng: dLng,
                    pickupTime: new Date(formData.pickupTime).toISOString(),
                    vehicleType: formData.vehicleType
                })
            });

            const data = await res.json();
            if (res.ok) {
                setQuote(data.price);
                setPricingBreakdown(data.breakdown);
                setStep(2); // Move to passenger details
            } else {
                toast.error(data.error || "Failed to calculate quote");
            }
        } catch (e) {
            toast.error("An error occurred getting your quote");
        } finally {
            setLoading(false);
        }
    };

    // Step 2: Submit Booking
    const handleSumbitBooking = async () => {
        if (!formData.passengerName || !formData.passengerPhone) {
            toast.error("Name and Phone number are required.");
            return;
        }
        setLoading(true);
        try {
            let pLat, pLng, dLat, dLng;
            try {
                const pGeo = await getGeocode({ address: formData.pickup });
                if (pGeo && pGeo.length > 0) {
                    const { lat: plt, lng: plg } = await getLatLng(pGeo[0]);
                    pLat = plt; pLng = plg;
                }

                const dGeo = await getGeocode({ address: formData.dropoff });
                if (dGeo && dGeo.length > 0) {
                    const { lat: dlt, lng: dlg } = await getLatLng(dGeo[0]);
                    dLat = dlt; dLng = dlg;
                }
            } catch (e) { }

            const res = await fetch(`/api/booker/${slug}/book`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...formData,
                    pickupLat: pLat, pickupLng: pLng,
                    dropoffLat: dLat, dropoffLng: dLng,
                    pickupTime: new Date(formData.pickupTime).toISOString()
                })
            });

            const data = await res.json();
            if (res.ok) {
                setBookingComplete(true);
                toast.success("Booking Confirmed!");
            } else {
                toast.error(data.error || "Failed to confirm booking.");
            }
        } catch (e) {
            toast.error("Connection error while booking.");
        } finally {
            setLoading(false);
        }
    };

    const containerVariants = {
        hidden: { opacity: 0, x: 20 },
        visible: { opacity: 1, x: 0, transition: { duration: 0.4, ease: "easeOut" } },
        exit: { opacity: 0, x: -20, transition: { duration: 0.3, ease: "easeIn" } }
    };

    return (
            <div className={`min-h-screen w-full flex ${isEmbed ? 'bg-transparent' : 'bg-[#0a0a0c]'}`} style={{ '--primary-brand': brandColor } as React.CSSProperties}>
                
                {/* Left Branding Pane (Hidden on Mobile) */}
                {!isEmbed && (
                    <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden flex-col justify-between p-12 border-r border-white/5">
                        {/* Dynamic Animated Background */}
                        <div className="absolute inset-0 bg-[#0a0a0c] z-0"></div>
                        <motion.div 
                            animate={{ 
                                scale: [1, 1.1, 1],
                                opacity: [0.15, 0.25, 0.15],
                            }}
                            transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
                            className="absolute -top-[20%] -left-[10%] w-[800px] h-[800px] rounded-full mix-blend-screen blur-[120px] pointer-events-none z-0"
                            style={{ backgroundColor: brandColor }}
                        />
                        <motion.div 
                            animate={{ 
                                scale: [1, 1.2, 1],
                                opacity: [0.1, 0.2, 0.1],
                                rotate: [0, 90, 0]
                            }}
                            transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
                            className="absolute -bottom-[30%] -right-[10%] w-[900px] h-[900px] rounded-full mix-blend-screen blur-[140px] pointer-events-none z-0"
                            style={{ backgroundColor: brandColor }}
                        />
                        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.03] pointer-events-none z-0 mix-blend-overlay"></div>
                        
                        {/* Content */}
                        <div className="relative z-10 flex items-center gap-4">
                            {logoUrl ? (
                                <img src={logoUrl} alt={companyName} className="h-12 object-contain drop-shadow-xl" />
                            ) : (
                                <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-2xl ring-1 ring-white/20" style={{ backgroundColor: brandColor }}>
                                    <Navigation2 className="w-6 h-6 text-white" />
                                </div>
                            )}
                            <h2 className="text-2xl font-bold tracking-tight text-white">{companyName}</h2>
                        </div>

                        <div className="relative z-10 max-w-md mt-auto mb-12">
                            <h1 className="text-5xl font-black text-white leading-tight mb-6 drop-shadow-2xl">
                                Premium Travel,<br/>
                                <span className="text-transparent bg-clip-text" style={{ backgroundImage: `linear-gradient(135deg, #fff, ${brandColor})` }}>Seamlessly Booked.</span>
                            </h1>
                            <p className="text-slate-400 text-lg font-medium leading-relaxed">
                                Experience the highest standard of transportation. Instant quotes, reliable drivers, and a luxury fleet at your fingertips.
                            </p>
                        </div>

                        <div className="relative z-10 flex items-center gap-4 text-sm font-semibold text-slate-500">
                            <div className="flex -space-x-3">
                                <div className="w-10 h-10 rounded-full border-2 border-[#0a0a0c] bg-slate-800 flex items-center justify-center text-xs">🚗</div>
                                <div className="w-10 h-10 rounded-full border-2 border-[#0a0a0c] bg-slate-700 flex items-center justify-center text-xs">✨</div>
                                <div className="w-10 h-10 rounded-full border-2 border-[#0a0a0c] bg-slate-600 flex items-center justify-center text-xs">💼</div>
                            </div>
                            <p>Trusted by over 10,000+ passengers.</p>
                        </div>
                    </div>
                )}

                {/* Right Booking Pane */}
                <div className={`w-full ${isEmbed ? '' : 'lg:w-1/2 flex items-center justify-center p-4 sm:p-8 relative'}`}>
                    
                    {/* Mobile Background Elements */}
                    {!isEmbed && (
                        <div className="lg:hidden absolute inset-0 z-0 overflow-hidden pointer-events-none">
                            <div className="absolute top-0 right-0 w-96 h-96 opacity-20 blur-[100px] rounded-full" style={{ backgroundColor: brandColor }}></div>
                        </div>
                    )}

                    <div className={`relative z-10 w-full max-w-xl mx-auto overflow-hidden transition-all duration-500 ${isEmbed ? 'bg-transparent' : 'bg-[#151518]/70 backdrop-blur-2xl border border-white/10 rounded-[2rem] shadow-2xl shadow-black/50 p-6 sm:p-10'}`}>
                        
                        {/* Mobile Header (Hidden on Desktop) */}
                        {!isEmbed && (
                            <div className="lg:hidden text-center mb-8">
                                 {logoUrl ? (
                                    <img src={logoUrl} alt={companyName} className="h-16 object-contain mx-auto mb-4 drop-shadow-xl" />
                                ) : (
                                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-2xl ring-1 ring-white/20" style={{ backgroundColor: brandColor }}>
                                        <Navigation2 className="w-8 h-8 text-white" />
                                    </div>
                                )}
                                <h2 className="text-2xl font-bold tracking-tight text-white">{companyName}</h2>
                            </div>
                        )}

                        <div className="mb-8">
                            <h3 className="text-xl sm:text-2xl font-bold text-white mb-2 tracking-tight">
                                {step === 1 ? 'Where to?' : step === 2 ? 'Passenger Details' : 'Booking Confirmed'}
                            </h3>
                            {step === 1 && <p className="text-slate-400 text-sm">Enter your trip details to get an instant quote.</p>}
                            {step === 2 && <p className="text-slate-400 text-sm">Just a few more details to secure your ride.</p>}
                            
                            {/* Progress Indicator */}
                            {!bookingComplete && (
                                <div className="flex gap-2 mt-6">
                                    <div className={`h-1.5 flex-1 rounded-full ${step >= 1 ? 'opacity-100' : 'opacity-20'} transition-all duration-500`} style={{ backgroundColor: brandColor }}></div>
                                    <div className={`h-1.5 flex-1 rounded-full ${step >= 2 ? 'opacity-100' : 'bg-white/10'} transition-all duration-500`} style={{ backgroundColor: step >= 2 ? brandColor : undefined }}></div>
                                    <div className={`h-1.5 flex-1 rounded-full bg-white/10 transition-all duration-500`}></div>
                                </div>
                            )}
                        </div>

                        <div className="relative overflow-hidden min-h-[400px]">
                            <AnimatePresence mode="wait">
                                
                                {/* STEP 1: QUOTE FORM */}
                                {step === 1 && !bookingComplete && (
                                    <motion.div
                                        key="step1"
                                        variants={containerVariants}
                                        initial="hidden"
                                        animate="visible"
                                        exit="exit"
                                        className="space-y-5"
                                    >
                                        <div className="space-y-4">
                                            <div className="relative group">
                                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-white transition-colors">
                                                    <MapPin className="w-5 h-5" />
                                                </div>
                                                <Input
                                                    placeholder="Pickup location"
                                                    value={pickupSearch.value}
                                                    onChange={(e) => { pickupSearch.setValue(e.target.value); setFormData({ ...formData, pickup: e.target.value }) }}
                                                    className="h-14 pl-12 bg-black/40 border-white/10 text-white placeholder:text-slate-500 focus:bg-white/5 focus:ring-1 focus:ring-white/30 focus:border-white/20 transition-all rounded-2xl shadow-inner"
                                                />
                                                {pickupSearch.status === "OK" && (
                                                    <motion.ul 
                                                        initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                                                        className="absolute z-50 w-full bg-[#1e1e24] border border-white/10 rounded-xl mt-2 shadow-2xl max-h-60 overflow-auto ring-1 ring-black/50 divide-y divide-white/5"
                                                    >
                                                        {pickupSearch.data.map(({ place_id, description }: any) => (
                                                            <li key={place_id}
                                                                className="p-4 hover:bg-white/5 cursor-pointer text-sm text-slate-200 transition-colors flex items-center gap-3"
                                                                onClick={() => {
                                                                    pickupSearch.setValue(description, false);
                                                                    setFormData({ ...formData, pickup: description });
                                                                    pickupSearch.clearSuggestions();
                                                                }}
                                                            >
                                                                <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                                                                <span className="truncate">{description}</span>
                                                            </li>
                                                        ))}
                                                    </motion.ul>
                                                )}
                                                {pickupSearch.status !== "OK" && pickupSearch.value.length > 0 && (
                                                    <div className="absolute z-50 w-full bg-[#1e1e24] border border-white/10 rounded-xl mt-2 shadow-2xl p-4 text-center text-sm text-slate-400">
                                                        {pickupSearch.status === "ZERO_RESULTS" ? "No locations found." : pickupSearch.status === "REQUEST_DENIED" ? "API Key Error." : "Searching..."}
                                                    </div>
                                                )}
                                            </div>

                                            <div className="pl-6 border-l-2 border-dashed border-white/10 ml-6 py-2 -my-2 h-6"></div>

                                            <div className="relative group">
                                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-white transition-colors">
                                                    <Flag className="w-5 h-5" />
                                                </div>
                                                <Input
                                                    placeholder="Where to?"
                                                    value={dropoffSearch.value}
                                                    onChange={(e) => { dropoffSearch.setValue(e.target.value); setFormData({ ...formData, dropoff: e.target.value }) }}
                                                    className="h-14 pl-12 bg-black/40 border-white/10 text-white placeholder:text-slate-500 focus:bg-white/5 focus:ring-1 focus:ring-white/30 focus:border-white/20 transition-all rounded-2xl shadow-inner"
                                                />
                                                {dropoffSearch.status === "OK" && (
                                                    <motion.ul 
                                                        initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                                                        className="absolute z-50 w-full bg-[#1e1e24] border border-white/10 rounded-xl mt-2 shadow-2xl max-h-60 overflow-auto ring-1 ring-black/50 divide-y divide-white/5"
                                                    >
                                                        {dropoffSearch.data.map(({ place_id, description }: any) => (
                                                            <li key={place_id}
                                                                className="p-4 hover:bg-white/5 cursor-pointer text-sm text-slate-200 transition-colors flex items-center gap-3"
                                                                onClick={() => {
                                                                    dropoffSearch.setValue(description, false);
                                                                    setFormData({ ...formData, dropoff: description });
                                                                    dropoffSearch.clearSuggestions();
                                                                }}
                                                            >
                                                                <Flag className="w-4 h-4 text-slate-400 shrink-0" />
                                                                <span className="truncate">{description}</span>
                                                            </li>
                                                        ))}
                                                    </motion.ul>
                                                )}
                                                {dropoffSearch.status !== "OK" && dropoffSearch.value.length > 0 && (
                                                    <div className="absolute z-50 w-full bg-[#1e1e24] border border-white/10 rounded-xl mt-2 shadow-2xl p-4 text-center text-sm text-slate-400">
                                                        {dropoffSearch.status === "ZERO_RESULTS" ? "No locations found." : dropoffSearch.status === "REQUEST_DENIED" ? "API Key Error." : "Searching..."}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                                            <div className="relative group">
                                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-white transition-colors pointer-events-none">
                                                    <Calendar className="w-5 h-5" />
                                                </div>
                                                <Input
                                                    type="datetime-local"
                                                    className="h-14 pl-12 bg-black/40 border-white/10 text-white placeholder:text-slate-500 focus:bg-white/5 focus:ring-1 focus:ring-white/30 focus:border-white/20 transition-all rounded-2xl shadow-inner [color-scheme:dark]"
                                                    value={formData.pickupTime}
                                                    onChange={(e) => setFormData({ ...formData, pickupTime: e.target.value })}
                                                />
                                            </div>
                                            <div className="relative group">
                                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-white transition-colors z-10 pointer-events-none">
                                                    <Car className="w-5 h-5" />
                                                </div>
                                                <Select value={formData.vehicleType} onValueChange={(val) => setFormData({ ...formData, vehicleType: val })}>
                                                    <SelectTrigger className="h-14 pl-12 bg-black/40 border-white/10 text-white focus:ring-1 focus:ring-white/30 focus:border-white/20 transition-all rounded-2xl shadow-inner">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent className="bg-[#1e1e24] border-white/10 text-white rounded-2xl shadow-2xl">
                                                        <SelectItem value="Saloon" className="focus:bg-white/10 focus:text-white cursor-pointer py-3 rounded-lg mx-1 my-1">Saloon (4 Pax)</SelectItem>
                                                        <SelectItem value="Estate" className="focus:bg-white/10 focus:text-white cursor-pointer py-3 rounded-lg mx-1 my-1">Estate (4+ Lugg)</SelectItem>
                                                        <SelectItem value="Executive" className="focus:bg-white/10 focus:text-white cursor-pointer py-3 rounded-lg mx-1 my-1">Executive (Premium)</SelectItem>
                                                        <SelectItem value="MPV" className="focus:bg-white/10 focus:text-white cursor-pointer py-3 rounded-lg mx-1 my-1">MPV (6 Pax)</SelectItem>
                                                        <SelectItem value="Minibus" className="focus:bg-white/10 focus:text-white cursor-pointer py-3 rounded-lg mx-1 my-1">Minibus (8+ Pax)</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>

                                        <Button
                                            onClick={handleGetQuote}
                                            disabled={loading || !formData.pickup || !formData.dropoff || !formData.pickupTime}
                                            className="w-full mt-4 h-14 text-white font-bold text-lg rounded-2xl transition-all duration-300 transform hover:-translate-y-0.5 disabled:opacity-50 disabled:transform-none shadow-[0_10px_30px_-10px_rgba(0,0,0,0.5)] group relative overflow-hidden"
                                            style={{ backgroundColor: brandColor }}
                                        >
                                            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out"></div>
                                            <span className="relative flex items-center justify-center gap-2">
                                                {loading ? <Loader2 className="animate-spin h-5 w-5" /> : "Calculate Quote"}
                                                {!loading && <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />}
                                            </span>
                                        </Button>
                                    </motion.div>
                                )}

                                {/* STEP 2: PASSENGER DETAILS */}
                                {step === 2 && !bookingComplete && (
                                    <motion.div
                                        key="step2"
                                        variants={containerVariants}
                                        initial="hidden"
                                        animate="visible"
                                        exit="exit"
                                        className="space-y-4"
                                    >
                                        <div className="relative overflow-hidden p-6 rounded-3xl border border-white/5 text-center shadow-inner mb-2" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
                                            <div className="absolute top-0 right-0 w-32 h-32 blur-[50px] opacity-20 rounded-full pointer-events-none" style={{ backgroundColor: brandColor }}></div>
                                            <p className="text-xs text-slate-400 uppercase tracking-widest font-bold mb-1">Estimated Fare</p>
                                            <p className="text-5xl font-black text-white tracking-tight drop-shadow-md">£{quote?.toFixed(2)}</p>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                                            <div className="relative group">
                                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-white transition-colors">
                                                    <User className="w-5 h-5" />
                                                </div>
                                                <Input
                                                    placeholder="Full Name"
                                                    className="h-14 pl-12 bg-black/40 border-white/10 text-white placeholder:text-slate-500 focus:bg-white/5 focus:ring-1 focus:ring-white/30 focus:border-white/20 transition-all rounded-2xl shadow-inner"
                                                    value={formData.passengerName}
                                                    onChange={(e) => setFormData({ ...formData, passengerName: e.target.value })}
                                                />
                                            </div>
                                            <div className="relative group">
                                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-white transition-colors">
                                                    <Phone className="w-5 h-5" />
                                                </div>
                                                <Input
                                                    type="tel"
                                                    placeholder="Phone Number"
                                                    className="h-14 pl-12 bg-black/40 border-white/10 text-white placeholder:text-slate-500 focus:bg-white/5 focus:ring-1 focus:ring-white/30 focus:border-white/20 transition-all rounded-2xl shadow-inner"
                                                    value={formData.passengerPhone}
                                                    onChange={(e) => setFormData({ ...formData, passengerPhone: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                        
                                        <div className="relative group">
                                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-white transition-colors">
                                                <Mail className="w-5 h-5" />
                                            </div>
                                            <Input
                                                type="email"
                                                placeholder="Email Address"
                                                className="h-14 pl-12 bg-black/40 border-white/10 text-white placeholder:text-slate-500 focus:bg-white/5 focus:ring-1 focus:ring-white/30 focus:border-white/20 transition-all rounded-2xl shadow-inner"
                                                value={formData.passengerEmail}
                                                onChange={(e) => setFormData({ ...formData, passengerEmail: e.target.value })}
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="relative group">
                                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-white transition-colors">
                                                    <Users className="w-5 h-5" />
                                                </div>
                                                <Input
                                                    type="number"
                                                    min="1" max="16"
                                                    placeholder="Passengers"
                                                    className="h-14 pl-12 bg-black/40 border-white/10 text-white placeholder:text-slate-500 focus:bg-white/5 focus:ring-1 focus:ring-white/30 focus:border-white/20 transition-all rounded-2xl shadow-inner"
                                                    value={formData.passengers}
                                                    onChange={(e) => setFormData({ ...formData, passengers: e.target.value })}
                                                />
                                            </div>
                                            <div className="relative group">
                                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-white transition-colors">
                                                    <Briefcase className="w-5 h-5" />
                                                </div>
                                                <Input
                                                    type="number"
                                                    min="0" max="10"
                                                    placeholder="Luggage"
                                                    className="h-14 pl-12 bg-black/40 border-white/10 text-white placeholder:text-slate-500 focus:bg-white/5 focus:ring-1 focus:ring-white/30 focus:border-white/20 transition-all rounded-2xl shadow-inner"
                                                    value={formData.luggage}
                                                    onChange={(e) => setFormData({ ...formData, luggage: e.target.value })}
                                                />
                                            </div>
                                        </div>

                                        <AnimatePresence>
                                            {(formData.pickup.toLowerCase().includes('airport') || formData.dropoff.toLowerCase().includes('airport')) && (
                                                <motion.div 
                                                    initial={{ opacity: 0, height: 0, marginTop: 0 }}
                                                    animate={{ opacity: 1, height: 'auto', marginTop: 16 }}
                                                    exit={{ opacity: 0, height: 0, marginTop: 0 }}
                                                    className="relative group overflow-hidden"
                                                >
                                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-amber-500 group-focus-within:text-amber-400 transition-colors">
                                                        <Plane className="w-5 h-5" />
                                                    </div>
                                                    <Input
                                                        placeholder="Flight Number (Optional)"
                                                        className="h-14 pl-12 bg-amber-500/5 border-amber-500/20 text-white placeholder:text-amber-500/50 focus:bg-amber-500/10 focus:ring-1 focus:ring-amber-500/50 transition-all rounded-2xl uppercase font-mono shadow-inner"
                                                        value={formData.flightNumber}
                                                        onChange={(e) => setFormData({ ...formData, flightNumber: e.target.value.toUpperCase() })}
                                                    />
                                                </motion.div>
                                            )}
                                        </AnimatePresence>

                                        <div className="relative group">
                                            <div className="absolute left-4 top-4 text-slate-400 group-focus-within:text-white transition-colors">
                                                <MessageSquare className="w-5 h-5" />
                                            </div>
                                            <textarea
                                                placeholder="Notes for driver (child seat, extra luggage...)"
                                                className="w-full min-h-[100px] pl-12 pr-4 py-4 bg-black/40 border border-white/10 text-white placeholder:text-slate-500 focus:bg-white/5 focus:ring-1 focus:ring-white/30 focus:border-white/20 transition-all rounded-2xl shadow-inner resize-none outline-none"
                                                value={formData.notes}
                                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                            />
                                        </div>
                                        
                                        <div className="pt-2">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div
                                                    onClick={() => setFormData({ ...formData, paymentType: 'CASH' })}
                                                    className={`p-4 rounded-2xl border cursor-pointer transition-all flex flex-col items-center justify-center gap-1 ${formData.paymentType === 'CASH' ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'bg-black/40 border-white/10 text-slate-400 hover:bg-white/10'}`}
                                                >
                                                    <span className="font-bold tracking-wider">CASH</span>
                                                    <span className="text-[10px] opacity-70 uppercase">Pay Driver</span>
                                                </div>
                                                <div
                                                    onClick={() => setFormData({ ...formData, paymentType: 'CARD' })}
                                                    className={`p-4 rounded-2xl border cursor-pointer transition-all flex flex-col items-center justify-center gap-1 ${formData.paymentType === 'CARD' ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'bg-black/40 border-white/10 text-slate-400 hover:bg-white/10'}`}
                                                >
                                                    <span className="font-bold tracking-wider">CARD</span>
                                                    <span className="text-[10px] opacity-70 uppercase">Pre-pay Securely</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex flex-col sm:flex-row gap-4 pt-4">
                                            <Button
                                                variant="outline"
                                                className="h-14 sm:w-1/3 bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:text-white font-semibold rounded-2xl transition-all"
                                                onClick={() => setStep(1)}
                                            >
                                                <ArrowLeft className="w-5 h-5 mr-2" /> Back
                                            </Button>
                                            <Button
                                                onClick={handleSumbitBooking}
                                                disabled={loading || !formData.passengerName || !formData.passengerPhone}
                                                className="h-14 sm:w-2/3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-lg rounded-2xl shadow-[0_10px_30px_-10px_rgba(16,185,129,0.5)] transition-all duration-300 transform hover:-translate-y-0.5 disabled:opacity-50 disabled:transform-none"
                                            >
                                                {loading ? <Loader2 className="animate-spin mr-2 h-5 w-5" /> : "Confirm & Book"}
                                            </Button>
                                        </div>
                                    </motion.div>
                                )}

                                {/* SUCCESS SCREEN */}
                                {bookingComplete && (
                                    <motion.div
                                        key="success"
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="flex flex-col items-center justify-center text-center py-8"
                                    >
                                        <motion.div 
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
                                            className="w-24 h-24 rounded-full bg-emerald-500/20 flex items-center justify-center mb-6"
                                        >
                                            <CheckCircle2 className="w-12 h-12 text-emerald-500" />
                                        </motion.div>
                                        
                                        <h2 className="text-3xl font-bold text-white mb-3">Booking Confirmed!</h2>
                                        <p className="text-slate-400 mb-8 max-w-sm">
                                            Your ride is booked. The dispatcher will assign a driver and you will receive updates shortly via SMS.
                                        </p>

                                        <div className="w-full bg-black/40 border border-white/5 rounded-2xl p-4 mb-8">
                                            <p className="text-sm text-slate-400 uppercase tracking-wider font-bold mb-1">To Pay Driver</p>
                                            <p className="text-3xl font-black text-white">£{quote?.toFixed(2)}</p>
                                        </div>

                                        <Button 
                                            onClick={() => window.location.reload()} 
                                            className="w-full h-14 bg-white/10 hover:bg-white/20 text-white border border-white/10 rounded-2xl transition-all"
                                        >
                                            Book Another Ride
                                        </Button>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>
            </div>
    );
}
