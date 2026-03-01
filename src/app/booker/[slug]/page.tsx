"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Navigation2, CheckCircle2 } from "lucide-react";
import usePlacesAutocomplete, { getGeocode, getLatLng } from "use-places-autocomplete";

export default function BookerPage() {
    const params = useParams();
    const slug = params.slug as string;

    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [bookingComplete, setBookingComplete] = useState(false);

    const [formData, setFormData] = useState({
        pickup: "",
        dropoff: "",
        pickupTime: "",
        vehicleType: "Saloon",
        passengerName: "",
        passengerPhone: "",
        passengers: "1",
        luggage: "0",
        notes: "",
        flightNumber: "",
    });

    const [quote, setQuote] = useState<number | null>(null);
    const [pricingBreakdown, setPricingBreakdown] = useState<any>(null);

    // Google Maps Autocomplete Hooks
    const pickupSearch = usePlacesAutocomplete({ requestOptions: { componentRestrictions: { country: "uk" } } }) as any;
    const dropoffSearch = usePlacesAutocomplete({ requestOptions: { componentRestrictions: { country: "uk" } } }) as any;

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
                const { lat: plt, lng: plg } = await getLatLng(pGeo[0]);
                pLat = plt; pLng = plg;

                const dGeo = await getGeocode({ address: formData.dropoff });
                const { lat: dlt, lng: dlg } = await getLatLng(dGeo[0]);
                dLat = dlt; dLng = dlg;
            } catch (e) {
                console.warn("Geocoding failed, trying server-side...", e);
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
                const { lat: plt, lng: plg } = await getLatLng(pGeo[0]);
                pLat = plt; pLng = plg;

                const dGeo = await getGeocode({ address: formData.dropoff });
                const { lat: dlt, lng: dlg } = await getLatLng(dGeo[0]);
                dLat = dlt; dLng = dlg;
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

    if (bookingComplete) {
        return (
            <div className="flex flex-col items-center justify-center h-[90vh] text-center p-6 fade-in">
                <CheckCircle2 className="w-20 h-20 text-green-500 mb-4" />
                <h1 className="text-3xl font-bold text-white mb-2">Booking Received!</h1>
                <p className="text-zinc-400 max-w-sm mb-6">
                    Maintian your phone, the dispatcher will assign a driver and update you shortly.
                    <br /><br />Estimated Fare: <b>£{quote?.toFixed(2)}</b> (Pay In Car)
                </p>
                <Button onClick={() => window.location.reload()} className="bg-zinc-800 hover:bg-zinc-700 text-white">Book Another Ride</Button>
            </div>
        );
    }

    return (
        <div className="max-w-xl mx-auto p-4 sm:p-6 lg:p-8 h-full">
            <Card className="bg-zinc-950/90 border-zinc-800 shadow-2xl backdrop-blur-xl">
                <CardHeader className="text-center border-b border-zinc-800 pb-6">
                    <div className="w-12 h-12 bg-blue-600/20 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Navigation2 className="w-6 h-6" />
                    </div>
                    <CardTitle className="text-2xl text-white">Book Your Ride</CardTitle>
                    <CardDescription className="text-zinc-400">Instant quotes and secure booking.</CardDescription>
                </CardHeader>

                <CardContent className="pt-6">
                    {step === 1 && (
                        <div className="space-y-4 fade-in">
                            <div className="space-y-2 relative">
                                <label className="text-sm font-medium text-zinc-300">Pickup Location</label>
                                <Input
                                    placeholder="Enter pickup address"
                                    value={pickupSearch.value}
                                    onChange={(e) => { pickupSearch.setValue(e.target.value); setFormData({ ...formData, pickup: e.target.value }) }}
                                    className="bg-zinc-900 border-zinc-800 text-white focus:ring-blue-500"
                                />
                                {pickupSearch.status === "OK" && (
                                    <ul className="absolute z-10 w-full bg-zinc-800 border-zinc-700 rounded-md mt-1 shadow-lg max-h-40 overflow-auto">
                                        {pickupSearch.data.map(({ place_id, description }: any) => (
                                            <li key={place_id}
                                                className="p-2 hover:bg-zinc-700 cursor-pointer text-sm text-zinc-200"
                                                onClick={() => {
                                                    pickupSearch.setValue(description, false);
                                                    setFormData({ ...formData, pickup: description });
                                                    pickupSearch.clearSuggestions();
                                                }}
                                            >{description}</li>
                                        ))}
                                    </ul>
                                )}
                            </div>

                            <div className="space-y-2 relative">
                                <label className="text-sm font-medium text-zinc-300">Dropoff Location</label>
                                <Input
                                    placeholder="Where are you going?"
                                    value={dropoffSearch.value}
                                    onChange={(e) => { dropoffSearch.setValue(e.target.value); setFormData({ ...formData, dropoff: e.target.value }) }}
                                    className="bg-zinc-900 border-zinc-800 text-white focus:ring-blue-500"
                                />
                                {dropoffSearch.status === "OK" && (
                                    <ul className="absolute z-10 w-full bg-zinc-800 border-zinc-700 rounded-md mt-1 shadow-lg max-h-40 overflow-auto">
                                        {dropoffSearch.data.map(({ place_id, description }: any) => (
                                            <li key={place_id}
                                                className="p-2 hover:bg-zinc-700 cursor-pointer text-sm text-zinc-200"
                                                onClick={() => {
                                                    dropoffSearch.setValue(description, false);
                                                    setFormData({ ...formData, dropoff: description });
                                                    dropoffSearch.clearSuggestions();
                                                }}
                                            >{description}</li>
                                        ))}
                                    </ul>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-zinc-300">Date & Time</label>
                                    <Input
                                        type="datetime-local"
                                        className="bg-zinc-900 border-zinc-800 text-white"
                                        value={formData.pickupTime}
                                        onChange={(e) => setFormData({ ...formData, pickupTime: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-zinc-300">Vehicle</label>
                                    <Select value={formData.vehicleType} onValueChange={(val) => setFormData({ ...formData, vehicleType: val })}>
                                        <SelectTrigger className="bg-zinc-900 border-zinc-800 text-white">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="bg-zinc-800 border-zinc-700 text-white">
                                            <SelectItem value="Saloon">Saloon (4)</SelectItem>
                                            <SelectItem value="Estate">Estate (4+Lugg)</SelectItem>
                                            <SelectItem value="Executive">Executive</SelectItem>
                                            <SelectItem value="MPV">MPV (6)</SelectItem>
                                            <SelectItem value="Minibus">Minibus (8+)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <Button
                                onClick={handleGetQuote}
                                disabled={loading || !formData.pickup || !formData.dropoff || !formData.pickupTime}
                                className="w-full mt-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-6 text-lg"
                            >
                                {loading ? <Loader2 className="animate-spin mr-2" /> : "Calculate Quote"}
                            </Button>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-4 fade-in">
                            <div className="bg-blue-900/20 border border-blue-500/30 p-4 rounded-lg text-center mb-6">
                                <p className="text-sm text-blue-200 uppercase tracking-wider font-semibold mb-1">Estimated Fare</p>
                                <p className="text-4xl font-bold text-white">£{quote?.toFixed(2)}</p>
                                <p className="text-xs text-blue-300 mt-2">Pay securely in the car (Cash/Card)</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-zinc-300">Full Name</label>
                                    <Input
                                        placeholder="Jane Doe"
                                        className="bg-zinc-900 border-zinc-800 text-white"
                                        value={formData.passengerName}
                                        onChange={(e) => setFormData({ ...formData, passengerName: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-zinc-300">Phone Number</label>
                                    <Input
                                        type="tel"
                                        placeholder="07..."
                                        className="bg-zinc-900 border-zinc-800 text-white"
                                        value={formData.passengerPhone}
                                        onChange={(e) => setFormData({ ...formData, passengerPhone: e.target.value })}
                                    />
                                </div>
                            </div>

                            {(formData.pickup.toLowerCase().includes('airport') || formData.dropoff.toLowerCase().includes('airport')) && (
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-zinc-300">Flight Number (If Airport)</label>
                                    <Input
                                        placeholder="e.g. BA123"
                                        className="bg-zinc-900 border-zinc-800 text-white uppercase"
                                        value={formData.flightNumber}
                                        onChange={(e) => setFormData({ ...formData, flightNumber: e.target.value.toUpperCase() })}
                                    />
                                </div>
                            )}

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-zinc-300">Special Notes for Driver</label>
                                <Input
                                    placeholder="Child seat needed, calling on arrival, etc..."
                                    className="bg-zinc-900 border-zinc-800 text-white"
                                    value={formData.notes}
                                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                />
                            </div>

                            <div className="flex gap-4 pt-4">
                                <Button
                                    variant="outline"
                                    className="w-1/3 border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                                    onClick={() => setStep(1)}
                                >
                                    Back
                                </Button>
                                <Button
                                    onClick={handleSumbitBooking}
                                    disabled={loading || !formData.passengerName || !formData.passengerPhone}
                                    className="w-2/3 bg-green-600 hover:bg-green-700 text-white font-semibold"
                                >
                                    {loading ? <Loader2 className="animate-spin mr-2" /> : "Confirm & Book"}
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
