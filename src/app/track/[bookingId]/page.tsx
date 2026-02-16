'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { GoogleMapsLoader } from '@/components/dashboard/google-maps-loader';
import { GoogleMap, Marker, DirectionsRenderer } from '@react-google-maps/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Phone, User, Car, MapPin, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

// Types matching API response
interface TrackingData {
    id: number;
    status: string;
    pickup: string;
    dropoff: string;
    pickupDate: string;
    driver: {
        name: string;
        callSign: string;
        phone: string;
        location: { lat: number; lng: number } | null;
        vehicle: {
            make: string;
            model: string;
            color: string;
            registration: string;
        } | null;
    } | null;
}

const mapContainerStyle = { w: '100%', h: '100%' };
const center = { lat: 51.5074, lng: -0.1278 }; // London default

export default function BookingTrackingPage() {
    return (
        <GoogleMapsLoader>
            <TrackingContent />
        </GoogleMapsLoader>
    );
}

function TrackingContent() {
    const params = useParams();
    const bookingId = params.bookingId as string;
    const [booking, setBooking] = useState<TrackingData | null>(null);
    const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
    const mapRef = useRef<google.maps.Map | null>(null);

    // Polling for updates
    useEffect(() => {
        const fetchBooking = async () => {
            try {
                const res = await fetch(`/api/booking/${bookingId}`);
                if (res.ok) {
                    const data = await res.json();
                    setBooking(data);
                }
            } catch (error) {
                console.error("Failed to fetch booking", error);
            }
        };

        fetchBooking();
        const interval = setInterval(fetchBooking, 10000); // Poll every 10s
        return () => clearInterval(interval);
    }, [bookingId]);

    // Calculate Route once pickup/dropoff are known
    useEffect(() => {
        if (booking && !directions && window.google) {
            const directionsService = new window.google.maps.DirectionsService();
            directionsService.route({
                origin: booking.pickup,
                destination: booking.dropoff,
                travelMode: window.google.maps.TravelMode.DRIVING,
            }, (result, status) => {
                if (status === 'OK') {
                    setDirections(result);
                }
            });
        }
    }, [booking, directions]);

    if (!booking) return <div className="flex items-center justify-center h-screen bg-slate-950 text-gold-500">Loading Booking...</div>;

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'PENDING': return 'bg-yellow-500/20 text-yellow-500';
            case 'ASSIGNED': return 'bg-blue-500/20 text-blue-500';
            case 'EN_ROUTE': return 'bg-purple-500/20 text-purple-500';
            case 'POB': return 'bg-green-500/20 text-green-500';
            case 'COMPLETED': return 'bg-emerald-500/20 text-emerald-500';
            case 'CANCELLED': return 'bg-red-500/20 text-red-500';
            default: return 'bg-slate-500/20 text-slate-500';
        }
    };

    const getStatusText = (status: string) => {
        switch (status) {
            case 'PENDING': return 'Finding your driver...';
            case 'ASSIGNED': return 'Driver Assigned';
            case 'EN_ROUTE': return 'Driver on the way';
            case 'POB': return 'Journey in progress';
            case 'COMPLETED': return 'Arrived';
            case 'CANCELLED': return 'Booking Cancelled';
            default: return status;
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row">
            {/* Left Panel: Status & Info */}
            <div className="w-full md:w-1/3 p-6 flex flex-col gap-6 border-r border-slate-800/50 z-10 bg-slate-950 shadow-2xl">
                <div>
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-gold-400 to-amber-600 bg-clip-text text-transparent mb-2">
                        Booking Tracker
                    </h1>
                    <p className="text-sm text-slate-400">Ref: #{booking.id.toString().padStart(6, '0')}</p>
                </div>

                {/* Status Card */}
                <Card className="bg-slate-900/50 border-slate-800">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg flex justify-between items-center">
                            Status
                            <Badge className={getStatusColor(booking.status)}>{booking.status}</Badge>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-lg font-medium text-slate-200">{getStatusText(booking.status)}</p>
                    </CardContent>
                </Card>

                {/* Journey Details */}
                <div className="space-y-4">
                    <div className="flex gap-3">
                        <div className="flex flex-col items-center gap-1 mt-1">
                            <div className="w-2 h-2 rounded-full bg-blue-500" />
                            <div className="w-0.5 h-full bg-slate-800" />
                            <div className="w-2 h-2 rounded-full bg-gold-500" />
                        </div>
                        <div className="flex-1 space-y-6">
                            <div>
                                <p className="text-xs text-slate-500 uppercase font-semibold">Pickup</p>
                                <p className="text-slate-200">{booking.pickup}</p>
                                <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                                    <Clock className="w-3 h-3" /> {new Date(booking.pickupDate).toLocaleString()}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 uppercase font-semibold">Dropoff</p>
                                <p className="text-slate-200">{booking.dropoff}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Driver Card (if assigned) */}
                {booking.driver && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                        <Card className="bg-slate-900 border-gold-500/30">
                            <CardHeader>
                                <CardTitle className="text-sm uppercase text-slate-500 tracking-wider">Your Driver</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700">
                                        <User className="w-6 h-6 text-slate-400" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-lg">{booking.driver.name}</p>
                                        <p className="text-gold-500 font-mono text-sm">{booking.driver.callSign}</p>
                                    </div>
                                    {booking.driver.phone && (
                                        <Button size="icon" variant="outline" className="ml-auto border-green-500/30 text-green-500 hover:bg-green-500/10">
                                            <Phone className="w-4 h-4" />
                                        </Button>
                                    )}
                                </div>
                                {booking.driver.vehicle && (
                                    <div className="flex items-center gap-3 p-3 bg-slate-950 rounded-lg border border-slate-800">
                                        <Car className="w-5 h-5 text-slate-400" />
                                        <div>
                                            <p className="text-sm font-medium">{booking.driver.vehicle.color} {booking.driver.vehicle.make} {booking.driver.vehicle.model}</p>
                                            <p className="text-xs text-slate-500 uppercase tracking-widest">{booking.driver.vehicle.registration}</p>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </motion.div>
                )}
            </div>

            {/* Right Panel: Map */}
            <div className="flex-1 h-[50vh] md:h-auto bg-slate-900 relative">
                <GoogleMap
                    mapContainerStyle={{ width: '100%', height: '100%' }}
                    center={center}
                    zoom={12}
                    options={{
                        styles: [ // Dark mode map styles
                            { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
                            { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
                            { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
                            { featureType: "road", elementType: "geometry", stylers: [{ color: "#38414e" }] },
                            { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#746855" }] },
                            { featureType: "water", elementType: "geometry", stylers: [{ color: "#17263c" }] },
                        ],
                        disableDefaultUI: true,
                        zoomControl: true,
                    }}
                    onLoad={map => { mapRef.current = map; }}
                >
                    {directions && <DirectionsRenderer directions={directions} options={{ polylineOptions: { strokeColor: '#d4af37', strokeWeight: 4 } }} />}

                    {booking.driver?.location && (
                        <Marker
                            position={booking.driver.location}
                            icon={{
                                path: window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
                                scale: 6,
                                fillColor: "#d4af37",
                                fillOpacity: 1,
                                strokeWeight: 2,
                                strokeColor: "#ffffff",
                                rotation: 0 // Ideally this would be the driver's bearing
                            }}
                        />
                    )}
                </GoogleMap>
            </div>
        </div>
    );
}
