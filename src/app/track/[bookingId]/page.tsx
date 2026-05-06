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
            case 'ARRIVED': return 'bg-fuchsia-500/20 text-fuchsia-400';
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
            case 'ARRIVED': return 'Driver arrives at pickup';
            case 'POB': return 'Journey in progress';
            case 'COMPLETED': return 'Arrived';
            case 'CANCELLED': return 'Booking Cancelled';
            default: return status;
        }
    };

    return (
        <div className="relative w-full h-screen bg-slate-950 overflow-hidden">
            {/* Map Background */}
            <div className="absolute inset-0 z-0">
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
                        zoomControl: false,
                    }}
                    onLoad={map => { mapRef.current = map; }}
                >
                    {directions && <DirectionsRenderer directions={directions} options={{ polylineOptions: { strokeColor: '#d4af37', strokeWeight: 4 } }} />}

                    {booking.driver?.location && (
                        <Marker
                            position={booking.driver.location}
                            icon={{
                                url: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png'
                            }}
                        />
                    )}
                </GoogleMap>
            </div>

            {/* Floating UI Container */}
            <div className="absolute inset-x-0 bottom-0 z-10 p-4 pb-8 bg-gradient-to-t from-slate-950 via-slate-950/90 to-transparent flex flex-col gap-4 pointer-events-none">
                
                <div className="pointer-events-auto">
                    <Card className="bg-slate-900/95 border-slate-800 shadow-2xl backdrop-blur-sm">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-lg flex justify-between items-center text-slate-100">
                                {getStatusText(booking.status)}
                                <Badge className={getStatusColor(booking.status)}>{booking.status}</Badge>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Driver Info */}
                            {booking.driver && (
                                <div className="flex items-center gap-4 bg-slate-950/50 p-3 rounded-lg border border-slate-800">
                                    <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700">
                                        <User className="w-6 h-6 text-slate-400" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-100">{booking.driver.name}</p>
                                        <p className="text-gold-500 font-mono text-xs">{booking.driver.callSign} • {booking.driver.vehicle?.color} {booking.driver.vehicle?.make}</p>
                                        <p className="text-slate-400 text-xs font-mono uppercase">{booking.driver.vehicle?.registration}</p>
                                    </div>
                                    {booking.driver.phone && (
                                        <a href={`tel:${booking.driver.phone}`} className="ml-auto">
                                            <Button size="icon" variant="outline" className="border-green-500/30 text-green-500 hover:bg-green-500/10 rounded-full h-10 w-10">
                                                <Phone className="w-4 h-4" />
                                            </Button>
                                        </a>
                                    )}
                                </div>
                            )}

                            {/* Addresses */}
                            <div className="flex gap-3 text-sm mt-2">
                                <div className="flex flex-col items-center gap-1 mt-1">
                                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                                    <div className="w-0.5 h-6 bg-slate-800" />
                                    <div className="w-2 h-2 rounded-full bg-gold-500" />
                                </div>
                                <div className="flex-1 space-y-3 text-slate-300">
                                    <p className="truncate">{booking.pickup}</p>
                                    <p className="truncate">{booking.dropoff}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
            
            {/* Header Badge */}
            <div className="absolute top-4 left-4 z-10 pointer-events-auto">
                <Badge variant="outline" className="bg-slate-950/80 backdrop-blur border-slate-800 text-slate-200 shadow-lg">
                    Ref: #{booking.id.toString().padStart(6, '0')}
                </Badge>
            </div>
        </div>
    );
}
