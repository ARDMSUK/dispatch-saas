"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Navigation2, CheckCircle2, MapPin, Flag, Calendar, Car, User, Phone, Plane, MessageSquare, ArrowRight, ArrowLeft, Mail, Briefcase, Users } from "lucide-react";
import { LocationInput } from "@/components/dashboard/location-input";
import { motion, AnimatePresence } from "framer-motion";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { Turnstile } from '@marsidev/react-turnstile';
import type { TurnstileInstance } from '@marsidev/react-turnstile';

export default function BookerPage() {
    const params = useParams();
    const slug = params.slug as string;

    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [bookingComplete, setBookingComplete] = useState(false);
    const [isEmbed, setIsEmbed] = useState(false);
    const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
    const [turnstileError, setTurnstileError] = useState(false);
    const turnstileRef = useRef<TurnstileInstance | null>(null);

    // Stripe Integration States
    const [clientSecret, setClientSecret] = useState<string | null>(null);
    const [publishableKey, setPublishableKey] = useState<string | null>(null);
    const [stripePromise, setStripePromise] = useState<any>(null);
    const [createdJobId, setCreatedJobId] = useState<string | null>(null);
    const [showStripePay, setShowStripePay] = useState(false);

    useEffect(() => {
        if (publishableKey) {
            setStripePromise(loadStripe(publishableKey));
        }
    }, [publishableKey]);

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
        pickupLat: undefined as number | undefined,
        pickupLng: undefined as number | undefined,
        dropoffLat: undefined as number | undefined,
        dropoffLng: undefined as number | undefined,
        distanceMiles: undefined as number | undefined,
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

    const [brandColor, setBrandColor] = useState('#3b82f6'); // Default Blue-500
    const [logoUrl, setLogoUrl] = useState('');
    const [companyName, setCompanyName] = useState('Book Your Ride');
    const [vehicleTypes, setVehicleTypes] = useState<string[]>(['Saloon', 'Estate', 'Executive', 'MPV']); // Default fallback

    const getVehicleDisplayInfo = (type: string) => {
        const lower = type.toLowerCase();
        if (lower.includes('8') || lower.includes('minibus')) return { pax: 8, extra: '8+ Pax' };
        if (lower.includes('6') || lower.includes('mpv')) return { pax: 6, extra: '6 Pax' };
        if (lower.includes('estate')) return { pax: 4, extra: '4+ Lugg' };
        if (lower.includes('exec') || lower.includes('vip') || lower.includes('luxury')) return { pax: 3, extra: 'Premium' };
        return { pax: 4, extra: 'Standard' };
    };

    // Load Google Maps Script
    useEffect(() => {
        if (typeof window !== "undefined" && !window.google) {
            if (!document.querySelector('script[src*="maps.googleapis.com"]')) {
                const script = document.createElement("script");
                script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places,geometry`;
                script.async = true;
                script.defer = true;
                document.head.appendChild(script);
            }
        }
    }, []);



    useEffect(() => {
        const fetchTenantInfo = async () => {
            try {
                const res = await fetch(`/api/booker/${slug}/info`);
                const data = await res.json();
                if (res.ok) {
                    if (data.brandColor) setBrandColor(data.brandColor);
                    if (data.logoUrl) setLogoUrl(data.logoUrl);
                    if (data.name) setCompanyName(data.name);
                    if (data.vehicleTypes && data.vehicleTypes.length > 0) {
                        const standardOrder = ['Saloon', 'Estate', 'Executive', 'MPV', 'Minibus'];
                        const sorted = [...data.vehicleTypes].sort((a, b) => {
                            const idxA = standardOrder.indexOf(a);
                            const idxB = standardOrder.indexOf(b);
                            if (idxA !== -1 && idxB !== -1) return idxA - idxB;
                            if (idxA !== -1) return -1;
                            if (idxB !== -1) return 1;
                            return a.localeCompare(b);
                        });
                        setVehicleTypes(sorted);
                        if (!sorted.includes(formData.vehicleType)) {
                            setFormData(prev => ({ ...prev, vehicleType: sorted[0] }));
                        }
                    }
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
        let distanceMiles = 0;
        try {
            if (typeof window !== 'undefined' && window.google && window.google.maps) {
                const directionsService = new google.maps.DirectionsService();
                const origin = formData.pickupLat && formData.pickupLng ? { lat: formData.pickupLat, lng: formData.pickupLng } : formData.pickup;
                const destination = formData.dropoffLat && formData.dropoffLng ? { lat: formData.dropoffLat, lng: formData.dropoffLng } : formData.dropoff;

                const result = await directionsService.route({
                    origin: origin,
                    destination: destination,
                    travelMode: google.maps.TravelMode.DRIVING
                });

                if (result.routes[0] && result.routes[0].legs) {
                    let totalMeters = 0;
                    result.routes[0].legs.forEach(leg => {
                        totalMeters += leg.distance?.value || 0;
                    });
                    distanceMiles = totalMeters / 1609.34;
                    setFormData(prev => ({ ...prev, distanceMiles }));
                }
            }
        } catch (error) {
            console.warn("Google Maps Distance failed, falling back to server-side calculation.", error);
        }

        try {
            const res = await fetch(`/api/booker/${slug}/quote`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    pickup: formData.pickup,
                    dropoff: formData.dropoff,
                    pickupLat: formData.pickupLat,
                    pickupLng: formData.pickupLng,
                    dropoffLat: formData.dropoffLat,
                    dropoffLng: formData.dropoffLng,
                    pickupTime: new Date(formData.pickupTime).toISOString(),
                    vehicleType: formData.vehicleType,
                    distanceMiles: distanceMiles > 0 ? distanceMiles : undefined
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
            const res = await fetch(`/api/booker/${slug}/book`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...formData,
                    price: quote,
                    pickupLat: formData.pickupLat, pickupLng: formData.pickupLng,
                    dropoffLat: formData.dropoffLat, dropoffLng: formData.dropoffLng,
                    pickupTime: new Date(formData.pickupTime).toISOString(),
                    turnstileToken
                })
            });

            const data = await res.json();
            if (res.ok) {
                if (data.fare !== undefined) {
                    setQuote(data.fare);
                }
                if (formData.paymentType === 'CARD' && data.clientSecret && data.publishableKey) {
                    setClientSecret(data.clientSecret);
                    setPublishableKey(data.publishableKey);
                    setCreatedJobId(data.bookingId);
                    setShowStripePay(true);
                } else {
                    setBookingComplete(true);
                    toast.success("Booking Confirmed!");
                }
            } else {
                toast.error(data.error || "Failed to confirm booking.");
                turnstileRef.current?.reset();
                setTurnstileToken(null);
            }
        } catch (e) {
            toast.error("Connection error while booking.");
            turnstileRef.current?.reset();
            setTurnstileToken(null);
        } finally {
            setLoading(false);
        }
    };

    const containerVariants: any = {
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
                            {logoUrl && (
                                <img src={logoUrl} alt={companyName} className="h-12 object-contain drop-shadow-xl" />
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

                    <div className={`relative z-10 w-full max-w-xl mx-auto overflow-y-auto overflow-x-hidden max-h-[90vh] transition-all duration-500 ${isEmbed ? 'bg-transparent' : 'bg-[#151518]/70 backdrop-blur-2xl border border-white/10 rounded-[2rem] shadow-2xl shadow-black/50 p-6 sm:p-10'}`}>
                        
                        {/* Mobile Header (Hidden on Desktop) */}
                        {!isEmbed && (
                            <div className="lg:hidden text-center mb-8">
                                 {logoUrl && (
                                    <img src={logoUrl} alt={companyName} className="h-16 object-contain mx-auto mb-4 drop-shadow-xl" />
                                 )}
                                <h2 className="text-2xl font-bold tracking-tight text-white">{companyName}</h2>
                            </div>
                        )}

                        <div className="mb-8">
                            <h3 className="text-xl sm:text-2xl font-bold text-white mb-2 tracking-tight">
                                {showStripePay ? 'Secure Payment' : step === 1 ? 'Where to?' : step === 2 ? 'Passenger Details' : 'Booking Confirmed'}
                            </h3>
                            {showStripePay && <p className="text-slate-400 text-sm">Please enter your card details below to complete pre-payment.</p>}
                            {step === 1 && !showStripePay && <p className="text-slate-400 text-sm">Enter your trip details to get an instant quote.</p>}
                            {step === 2 && !showStripePay && <p className="text-slate-400 text-sm">Just a few more details to secure your ride.</p>}
                            
                            {/* Progress Indicator */}
                            {!bookingComplete && (
                                <div className="flex gap-2 mt-6">
                                    <div className={`h-1.5 flex-1 rounded-full ${step >= 1 ? 'opacity-100' : 'opacity-20'} transition-all duration-500`} style={{ backgroundColor: brandColor }}></div>
                                    <div className={`h-1.5 flex-1 rounded-full ${(step >= 2 || showStripePay) ? 'opacity-100' : 'bg-white/10'} transition-all duration-500`} style={{ backgroundColor: (step >= 2 || showStripePay) ? brandColor : undefined }}></div>
                                    <div className={`h-1.5 flex-1 rounded-full ${showStripePay ? 'opacity-100' : 'bg-white/10'} transition-all duration-500`} style={{ backgroundColor: showStripePay ? brandColor : undefined }}></div>
                                </div>
                            )}
                        </div>

                        <div className="relative overflow-hidden min-h-[400px]">
                            <AnimatePresence mode="wait">
                                
                                {/* STEP 1: QUOTE FORM */}
                                {step === 1 && !bookingComplete && !showStripePay && (
                                    <motion.div
                                        key="step1"
                                        variants={containerVariants}
                                        initial="hidden"
                                        animate="visible"
                                        exit="exit"
                                        className="space-y-5"
                                    >
                                        <div className="space-y-4 relative">
                                            {/* Pickup Input */}
                                            <div className="relative group">
                                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-400 group-focus-within:text-emerald-300 transition-colors z-10">
                                                    <MapPin className="w-5 h-5" />
                                                </div>
                                                <LocationInput
                                                    placeholder="Pickup location"
                                                    value={formData.pickup}
                                                    onChange={(val) => setFormData(prev => ({ ...prev, pickup: val }))}
                                                    onLocationSelect={(loc) => {
                                                        setFormData(prev => ({ ...prev, pickup: loc.address, pickupLat: loc.lat, pickupLng: loc.lng }));
                                                        setQuote(null);
                                                    }}
                                                    className="h-14 pl-12 bg-black/40 border-white/10 text-white placeholder:text-slate-500 focus:bg-white/5 focus:ring-1 focus:ring-white/30 focus:border-white/20 transition-all rounded-2xl shadow-inner w-full"
                                                />
                                            </div>

                                            <div className="pl-6 border-l-2 border-dashed border-white/10 ml-6 py-2 -my-2 h-6"></div>

                                            {/* Dropoff Input */}
                                            <div className="relative group">
                                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-rose-400 group-focus-within:text-rose-300 transition-colors z-10">
                                                    <Flag className="w-5 h-5" />
                                                </div>
                                                <LocationInput
                                                    placeholder="Where to?"
                                                    value={formData.dropoff}
                                                    onChange={(val) => setFormData(prev => ({ ...prev, dropoff: val }))}
                                                    onLocationSelect={(loc) => {
                                                        setFormData(prev => ({ ...prev, dropoff: loc.address, dropoffLat: loc.lat, dropoffLng: loc.lng }));
                                                        setQuote(null);
                                                    }}
                                                    className="h-14 pl-12 bg-black/40 border-white/10 text-white placeholder:text-slate-500 focus:bg-white/5 focus:ring-1 focus:ring-white/30 focus:border-white/20 transition-all rounded-2xl shadow-inner w-full"
                                                />
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
                                                    onChange={(e) => setFormData(prev => ({ ...prev, pickupTime: e.target.value }))}
                                                />
                                            </div>
                                            <div className="relative group">
                                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-white transition-colors z-10 pointer-events-none">
                                                    <Car className="w-5 h-5" />
                                                </div>
                                                <Select value={formData.vehicleType} onValueChange={(val) => setFormData(prev => ({ ...prev, vehicleType: val }))}>
                                                    <SelectTrigger className="h-14 pl-12 bg-black/40 border-white/10 text-white focus:ring-1 focus:ring-white/30 focus:border-white/20 transition-all rounded-2xl shadow-inner">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent className="bg-[#1e1e24] border-white/10 text-white rounded-2xl shadow-2xl">
                                                        {vehicleTypes.map((v) => {
                                                            const info = getVehicleDisplayInfo(v);
                                                            return (
                                                                <SelectItem key={v} value={v} className="focus:bg-white/10 focus:text-white cursor-pointer py-3 rounded-lg mx-1 my-1">
                                                                    {v} ({info.extra})
                                                                </SelectItem>
                                                            );
                                                        })}
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
                                {step === 2 && !bookingComplete && !showStripePay && (
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
                                                    onChange={(e) => setFormData(prev => ({ ...prev, passengerName: e.target.value }))}
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
                                                    onChange={(e) => setFormData(prev => ({ ...prev, passengerPhone: e.target.value }))}
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
                                                onChange={(e) => setFormData(prev => ({ ...prev, passengerEmail: e.target.value }))}
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
                                                    onChange={(e) => setFormData(prev => ({ ...prev, passengers: e.target.value }))}
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
                                                    onChange={(e) => setFormData(prev => ({ ...prev, luggage: e.target.value }))}
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
                                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-600 group-focus-within:text-blue-500 transition-colors">
                                                        <Plane className="w-5 h-5" />
                                                    </div>
                                                    <Input
                                                        placeholder="Flight Number (Optional)"
                                                        className="h-14 pl-12 bg-indigo-600/5 border-indigo-600/20 text-white placeholder:text-indigo-600/50 focus:bg-indigo-600/10 focus:ring-1 focus:ring-indigo-600/50 transition-all rounded-2xl uppercase font-mono shadow-inner"
                                                        value={formData.flightNumber}
                                                        onChange={(e) => setFormData(prev => ({ ...prev, flightNumber: e.target.value.toUpperCase() }))}
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
                                                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                                            />
                                        </div>
                                        
                                        <div className="pt-2">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div
                                                    onClick={() => setFormData(prev => ({ ...prev, paymentType: 'CASH' }))}
                                                    className={`p-4 rounded-2xl border cursor-pointer transition-all flex flex-col items-center justify-center gap-1 ${formData.paymentType === 'CASH' ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'bg-black/40 border-white/10 text-slate-400 hover:bg-white/10'}`}
                                                >
                                                    <span className="font-bold tracking-wider">CASH</span>
                                                    <span className="text-[10px] opacity-70 uppercase">Pay Driver</span>
                                                </div>
                                                <div
                                                    onClick={() => setFormData(prev => ({ ...prev, paymentType: 'CARD' }))}
                                                    className={`p-4 rounded-2xl border cursor-pointer transition-all flex flex-col items-center justify-center gap-1 ${formData.paymentType === 'CARD' ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'bg-black/40 border-white/10 text-slate-400 hover:bg-white/10'}`}
                                                >
                                                    <span className="font-bold tracking-wider">CARD</span>
                                                    <span className="text-[10px] opacity-70 uppercase">Pre-pay Securely</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="pt-4 flex flex-col items-center justify-center min-h-[70px] z-20 relative">
                                            <Turnstile 
                                                ref={turnstileRef}
                                                siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '1x00000000000000000000AA'}
                                                onSuccess={(token) => {
                                                    setTurnstileToken(token);
                                                    setTurnstileError(false);
                                                }}
                                                onExpire={() => setTurnstileToken(null)}
                                                onError={() => setTurnstileError(true)}
                                                options={{ theme: 'dark' }}
                                            />
                                            {turnstileError && (
                                                <p className="text-rose-400 text-sm mt-2 text-center font-medium">
                                                    Security check could not load. Please refresh the page or contact us.
                                                </p>
                                            )}
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
                                                disabled={loading || !formData.passengerName || !formData.passengerPhone || !turnstileToken}
                                                className="h-14 sm:w-2/3 bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-lg rounded-2xl shadow-[0_10px_30px_-10px_rgba(16,185,129,0.5)] transition-all duration-300 transform hover:-translate-y-0.5 disabled:opacity-50 disabled:transform-none"
                                            >
                                                {loading ? <Loader2 className="animate-spin mr-2 h-5 w-5" /> : "Confirm & Book"}
                                            </Button>
                                        </div>
                                    </motion.div>
                                )}

                                {/* STRIPE PAYMENT STEP */}
                                {showStripePay && !bookingComplete && (
                                    <motion.div
                                        key="stripe-pay"
                                        variants={containerVariants}
                                        initial="hidden"
                                        animate="visible"
                                        exit="exit"
                                        className="space-y-4 text-white"
                                    >
                                        {stripePromise && clientSecret ? (
                                            <Elements
                                                stripe={stripePromise}
                                                options={{
                                                    clientSecret,
                                                    appearance: {
                                                        theme: 'night',
                                                        variables: { colorPrimary: '#10b981', colorBackground: '#151518', colorText: '#ffffff' }
                                                    }
                                                }}
                                            >
                                                <StripeCheckoutForm
                                                    amount={quote || 0}
                                                    onSuccess={async (paymentIntentId) => {
                                                        setLoading(true);
                                                        try {
                                                            const res = await fetch(`/api/booker/${slug}/book/confirm-payment`, {
                                                                method: 'POST',
                                                                headers: { 'Content-Type': 'application/json' },
                                                                body: JSON.stringify({ jobId: createdJobId, paymentIntentId })
                                                            });
                                                            const data = await res.json();
                                                            if (res.ok && data.success) {
                                                                setShowStripePay(false);
                                                                setBookingComplete(true);
                                                                if (data.status === 'PROCESSING') {
                                                                    toast.success("Payment received. We are confirming your booking. This may take a few seconds.");
                                                                } else {
                                                                    toast.success("Payment Confirmed & Job Booked!");
                                                                }
                                                            } else {
                                                                toast.error(data.error || "Failed to confirm payment with dispatch console.");
                                                            }
                                                        } catch (e) {
                                                            toast.error("Connection error during payment confirmation.");
                                                        } finally {
                                                            setLoading(false);
                                                        }
                                                    }}
                                                    onError={(err) => {
                                                        toast.error(err);
                                                    }}
                                                    onCancel={() => {
                                                        setShowStripePay(false);
                                                    }}
                                                />
                                            </Elements>
                                        ) : (
                                            <div className="py-12 flex flex-col items-center justify-center text-emerald-500 gap-3">
                                                <Loader2 className="h-8 w-8 animate-spin" />
                                                <p className="text-sm text-slate-400">Loading secure checkout...</p>
                                            </div>
                                        )}
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
                                            <p className="text-sm text-slate-400 uppercase tracking-wider font-bold mb-1">
                                                {formData.paymentType === 'CARD' ? 'Paid Securely' : 'To Pay Driver'}
                                            </p>
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

                            {/* Legal Links Footer */}
                            <div className="mt-8 pt-4 border-t border-white/5 flex flex-wrap justify-center items-center gap-x-4 gap-y-2 text-[10px] sm:text-xs text-zinc-500 font-medium tracking-wide select-none">
                                <a href="/legal/terms" target="_blank" className="hover:text-zinc-300 transition-colors">Terms of Service</a>
                                <span className="opacity-30">•</span>
                                <a href="/legal/privacy" target="_blank" className="hover:text-zinc-300 transition-colors">Privacy Policy</a>
                                <span className="opacity-30">•</span>
                                <a href="/legal/gdpr" target="_blank" className="hover:text-zinc-300 transition-colors">GDPR & Data Protection</a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
    );
}

interface StripeCheckoutFormProps {
    amount: number;
    onSuccess: (paymentIntentId: string) => void;
    onError: (error: string) => void;
    onCancel: () => void;
}

function StripeCheckoutForm({ amount, onSuccess, onError, onCancel }: StripeCheckoutFormProps) {
    const stripe = useStripe();
    const elements = useElements();
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!stripe || !elements) return;

        setIsLoading(true);
        setMessage(null);

        const { error, paymentIntent } = await stripe.confirmPayment({
            elements,
            confirmParams: {
                return_url: `${window.location.origin}/booker/callback`,
            },
            redirect: 'if_required'
        });

        if (error) {
            setMessage(error.message || "Payment failed");
            onError(error.message || "Payment failed");
            setIsLoading(false);
        } else if (paymentIntent && paymentIntent.status === 'succeeded') {
            onSuccess(paymentIntent.id);
        } else {
            setMessage("Payment in unexpected state");
            setIsLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-black/40 p-5 rounded-2xl border border-white/5 shadow-inner">
                <div className="flex justify-between items-center mb-4 text-sm">
                    <span className="text-slate-400">Total to Pay</span>
                    <span className="text-2xl font-bold text-white">£{amount.toFixed(2)}</span>
                </div>

                <PaymentElement
                    options={{
                        layout: 'accordion',
                        defaultValues: {
                            billingDetails: {
                                name: 'Valued Customer'
                            }
                        }
                    }}
                />
            </div>

            {message && <div className="text-rose-400 text-sm bg-rose-500/10 p-3 rounded-xl border border-rose-500/20">{message}</div>}

            <div className="flex gap-4">
                <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading} className="flex-1 bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 h-14 rounded-2xl">
                    Cancel
                </Button>
                <Button type="submit" disabled={isLoading || !stripe || !elements} className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-white font-bold h-14 rounded-2xl shadow-[0_10px_30px_-10px_rgba(16,185,129,0.5)]">
                    {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : "Pay £" + amount.toFixed(2)}
                </Button>
            </div>
        </form>
    );
}
