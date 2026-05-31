'use client';

import { useState, useCallback, useEffect } from 'react';
import { GoogleMap, MarkerF } from '@react-google-maps/api';
import { createClient } from '@/utils/supabase/client';
import { toast } from 'sonner';
import { Loader2, ExternalLink, Moon, Sun, Search, Car, Radio, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

const LONDON_CENTER = { lat: 51.5074, lng: -0.1278 };

const DARK_MAP_STYLE = [
    { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
    { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
    { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
    {
        featureType: "administrative.locality",
        elementType: "labels.text.fill",
        stylers: [{ color: "#d59563" }],
    },
    {
        featureType: "poi",
        elementType: "labels.text.fill",
        stylers: [{ color: "#d59563" }],
    },
    {
        featureType: "poi.park",
        elementType: "geometry",
        stylers: [{ color: "#263c3f" }],
    },
    {
        featureType: "poi.park",
        elementType: "labels.text.fill",
        stylers: [{ color: "#6b9a76" }],
    },
    {
        featureType: "road",
        elementType: "geometry",
        stylers: [{ color: "#38414e" }],
    },
    {
        featureType: "road",
        elementType: "geometry.stroke",
        stylers: [{ color: "#212a37" }],
    },
    {
        featureType: "road",
        elementType: "labels.text.fill",
        stylers: [{ color: "#9ca5b3" }],
    },
    {
        featureType: "road.highway",
        elementType: "geometry",
        stylers: [{ color: "#746855" }],
    },
    {
        featureType: "road.highway",
        elementType: "geometry.stroke",
        stylers: [{ color: "#1f2835" }],
    },
    {
        featureType: "road.highway",
        elementType: "labels.text.fill",
        stylers: [{ color: "#f3d19c" }],
    },
    {
        featureType: "transit",
        elementType: "geometry",
        stylers: [{ color: "#2f3948" }],
    },
    {
        featureType: "transit.station",
        elementType: "labels.text.fill",
        stylers: [{ color: "#d59563" }],
    },
    {
        featureType: "water",
        elementType: "geometry",
        stylers: [{ color: "#17263c" }],
    },
    {
        featureType: "water",
        elementType: "labels.text.fill",
        stylers: [{ color: "#515c6d" }],
    },
    {
        featureType: "water",
        elementType: "labels.text.stroke",
        stylers: [{ color: "#17263c" }],
    },
];

export default function StandaloneMapPage() {
    const [map, setMap] = useState<google.maps.Map | null>(null);
    const [user, setUser] = useState<any>(null);
    const [drivers, setDrivers] = useState<any[]>([]);
    const [mapSearchTerm, setMapSearchTerm] = useState('');
    const [trackingDriverId, setTrackingDriverId] = useState<string | null>(null);
    const [mapStyle, setMapStyle] = useState<'dark' | 'standard'>('dark');
    const [loading, setLoading] = useState(true);

    const onLoad = useCallback((map: google.maps.Map) => {
        setMap(map);
    }, []);

    const onUnmount = useCallback(() => {
        setMap(null);
    }, []);

    // Load google maps script dynamically if not present
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

    // Fetch tenant and drivers
    useEffect(() => {
        const loadInitialData = async () => {
            try {
                const [tenantRes, driverRes] = await Promise.all([
                    fetch('/api/settings/organization'),
                    fetch('/api/drivers')
                ]);
                if (tenantRes.ok) {
                    const tenantData = await tenantRes.json();
                    setUser({ tenant: tenantData });
                }
                if (driverRes.ok) {
                    setDrivers(await driverRes.json());
                }
            } catch (err) {
                console.error("Error loading standalone map data", err);
            } finally {
                setLoading(false);
            }
        };

        loadInitialData();

        const interval = setInterval(async () => {
            try {
                const res = await fetch('/api/drivers');
                if (res.ok) setDrivers(await res.json());
            } catch (e) {
                console.error("Failed to poll drivers", e);
            }
        }, 15000);

        return () => clearInterval(interval);
    }, []);

    // Realtime Supabase coordinate listening
    useEffect(() => {
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        if (!url || !key) return;

        try {
            const supabase = createClient();
            const channel = supabase.channel('drivers-location-standalone');

            channel.on('broadcast', { event: 'location' }, (payload: any) => {
                const data = payload.payload;
                if (data && data.driverId) {
                    setDrivers(prevDrivers => {
                        return prevDrivers.map(d => {
                            if (d.id === data.driverId) {
                                return {
                                    ...d,
                                    currentLat: data.lat,
                                    currentLng: data.lng,
                                    location: JSON.stringify({
                                        lat: data.lat,
                                        lng: data.lng,
                                        heading: data.heading,
                                        speed: data.speed,
                                        timestamp: data.timestamp
                                    })
                                };
                            }
                            return d;
                        });
                    });
                }
            });

            channel.subscribe();

            return () => {
                supabase.removeChannel(channel);
            };
        } catch (err) {
            console.error("Standalone map websocket subscription error", err);
        }
    }, []);

    // Fit bounds or track selected
    useEffect(() => {
        if (!map || drivers.length === 0) return;

        if (trackingDriverId) {
            const driver = drivers.find(d => d.id === trackingDriverId);
            if (driver) {
                try {
                    let pos = null;
                    if (driver.currentLat && driver.currentLng) {
                        pos = { lat: driver.currentLat, lng: driver.currentLng };
                    } else if (driver.location) {
                        pos = JSON.parse(driver.location);
                    }
                    if (pos && pos.lat && pos.lng) {
                        map.panTo(pos);
                    }
                } catch (e) {}
            }
            return;
        }

        const bounds = new google.maps.LatLngBounds();
        let hasDriverLoc = false;

        drivers.forEach(d => {
            try {
                let pos = null;
                if (d.currentLat && d.currentLng) {
                    pos = { lat: d.currentLat, lng: d.currentLng };
                } else if (d.location) {
                    pos = JSON.parse(d.location);
                }
                if (pos && pos.lat && pos.lng) {
                    bounds.extend(pos);
                    hasDriverLoc = true;
                }
            } catch (e) {}
        });

        if (hasDriverLoc) {
            if (user?.tenant?.lat && user?.tenant?.lng) {
                bounds.extend({ lat: user.tenant.lat, lng: user.tenant.lng });
            }
            map.fitBounds(bounds);
        }
    }, [map, drivers, user, trackingDriverId]);

    const handleSearchMap = () => {
        if (!map || !mapSearchTerm) return;
        const driver = drivers.find(d => 
            d.callsign?.toLowerCase() === mapSearchTerm.toLowerCase() || 
            d.name?.toLowerCase().includes(mapSearchTerm.toLowerCase()) ||
            d.callsign?.toLowerCase().includes(mapSearchTerm.toLowerCase())
        );
        
        if (driver) {
            try {
                let pos = null;
                if (driver.currentLat && driver.currentLng) {
                    pos = { lat: driver.currentLat, lng: driver.currentLng };
                } else if (driver.location) {
                    pos = JSON.parse(driver.location);
                }

                if (pos && pos.lat && pos.lng) {
                    map.panTo(pos);
                    map.setZoom(16);
                    setTrackingDriverId(driver.id);
                    toast.success(`Tracking Callsign ${driver.callsign}`);
                } else {
                     toast.error("Driver location is invalid");
                }
            } catch (e) {
                toast.error("Driver location is invalid");
            }
        } else {
            toast.error("Driver not found or offline");
        }
    };

    if (loading) {
        return (
            <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#0a0a0c] text-white">
                <Loader2 className="h-10 w-10 animate-spin text-emerald-500 mb-4" />
                <p className="text-slate-400 font-medium tracking-wide">Loading Standalone Fleet Map...</p>
            </div>
        );
    }

    return (
        <div className="h-screen w-screen relative overflow-hidden bg-[#09090b] font-sans">
            {/* Header Control Overlay */}
            <div className="absolute top-4 left-4 right-4 flex flex-col md:flex-row gap-3 z-10 pointer-events-none">
                <div className="flex gap-2 items-center bg-zinc-900/90 backdrop-blur border border-white/10 rounded-2xl p-3 shadow-2xl pointer-events-auto shrink-0 select-none">
                    <Link href="/dashboard" className="text-slate-400 hover:text-white transition-colors mr-2">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div className="flex flex-col">
                        <h1 className="text-sm font-extrabold text-white tracking-wide uppercase flex items-center gap-1.5">
                            <Radio className="w-4 h-4 text-emerald-500 animate-pulse" />
                            Live Fleet Map
                        </h1>
                        <p className="text-[10px] text-slate-500 font-bold uppercase">{user?.tenant?.name || 'Company Grid'}</p>
                    </div>
                </div>

                <div className="flex flex-1 gap-2 pointer-events-auto max-w-lg md:ml-auto">
                    <div className="relative flex-1 group">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-white transition-colors w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Find callsigned vehicle (e.g. 101)..."
                            className="w-full h-12 pl-10 pr-4 bg-zinc-900/95 backdrop-blur border border-white/10 text-white placeholder:text-slate-500 rounded-2xl focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-sm shadow-xl"
                            value={mapSearchTerm}
                            onChange={e => setMapSearchTerm(e.target.value)}
                            onKeyDown={e => {
                                if (e.key === 'Enter') handleSearchMap();
                            }}
                        />
                    </div>
                    <button 
                        onClick={handleSearchMap}
                        className="px-6 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold rounded-2xl transition-all shadow-xl h-12 flex items-center justify-center gap-1.5 cursor-pointer text-sm"
                    >
                        Search
                    </button>
                </div>

                <div className="flex gap-2 pointer-events-auto shrink-0">
                    <button
                        onClick={() => {
                            setTrackingDriverId(null);
                            if (map) map.setZoom(12);
                            toast.success("Zoom reset. Tracking all drivers.");
                        }}
                        className="h-12 px-4 bg-zinc-900/90 backdrop-blur border border-white/10 hover:bg-zinc-800 text-slate-300 hover:text-white transition-all rounded-2xl flex items-center justify-center gap-1.5 cursor-pointer text-xs font-bold shadow-xl"
                        title="Show All Fleet"
                    >
                        <Car className="w-4 h-4" /> Show All
                    </button>

                    <button
                        onClick={() => setMapStyle(prev => prev === 'dark' ? 'standard' : 'dark')}
                        className="h-12 w-12 bg-zinc-900/90 backdrop-blur border border-white/10 hover:bg-zinc-800 text-slate-300 hover:text-white transition-all rounded-2xl flex items-center justify-center cursor-pointer shadow-xl"
                        title="Toggle Map Style"
                    >
                        {mapStyle === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                    </button>
                </div>
            </div>

            {/* Sidebar Floating Queue Panel */}
            <div className="absolute bottom-4 left-4 w-[280px] max-h-[40vh] bg-zinc-950/90 backdrop-blur border border-white/10 rounded-3xl z-10 p-4 shadow-2xl flex flex-col overflow-hidden">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-2.5 flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                    Active Drivers ({drivers.filter(d => d.status !== 'OFF_DUTY').length})
                </h3>
                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1.5 pr-1">
                    {drivers.filter(d => d.status !== 'OFF_DUTY').map(driver => (
                        <div 
                            key={driver.id} 
                            onClick={() => {
                                setTrackingDriverId(driver.id);
                                toast.success(`Tracking ${driver.name}`);
                            }}
                            className={`p-2 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${trackingDriverId === driver.id ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400' : 'bg-white/5 border-white/5 text-slate-300 hover:bg-white/10 hover:text-white'}`}
                        >
                            <div className="flex items-center gap-2">
                                <span className={`h-2 w-2 rounded-full ${driver.status === 'FREE' || driver.status === 'ONLINE' ? 'bg-emerald-500' : driver.status === 'BUSY' ? 'bg-blue-500' : 'bg-amber-500'}`}></span>
                                <span className="text-xs font-extrabold">{driver.callsign}</span>
                                <span className="text-xs font-medium truncate max-w-[120px]">{driver.name}</span>
                            </div>
                            <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">{driver.status}</span>
                        </div>
                    ))}
                    {drivers.filter(d => d.status !== 'OFF_DUTY').length === 0 && (
                        <p className="text-xs text-slate-500 text-center py-4 font-medium">No drivers active.</p>
                    )}
                </div>
            </div>

            {/* Google Map Full Viewport */}
            <div className="h-full w-full">
                <GoogleMap
                    mapContainerStyle={{ width: '100%', height: '100%' }}
                    center={
                        user?.tenant?.lat && user?.tenant?.lng
                            ? { lat: user.tenant.lat, lng: user.tenant.lng }
                            : LONDON_CENTER
                    }
                    zoom={user?.tenant?.lat ? 13 : 11}
                    onLoad={onLoad}
                    onUnmount={onUnmount}
                    options={{
                        disableDefaultUI: false,
                        zoomControl: true,
                        mapTypeControl: false,
                        streetViewControl: false,
                        fullscreenControl: false,
                        styles: mapStyle === 'dark' ? DARK_MAP_STYLE : undefined
                    }}
                >
                    {drivers.map(driver => {
                        try {
                            let pos = null;
                            if (driver.currentLat && driver.currentLng) {
                                pos = { lat: driver.currentLat, lng: driver.currentLng };
                            } else if (driver.location) {
                                pos = JSON.parse(driver.location);
                            }

                            if (!pos || !pos.lat || !pos.lng) return null;

                            return (
                                <MarkerF
                                    key={driver.id}
                                    position={pos}
                                    icon={
                                        (driver.status === 'ONLINE' || driver.status === 'FREE') 
                                            ? 'https://maps.google.com/mapfiles/ms/icons/green-dot.png' 
                                            : driver.status === 'BUSY' 
                                            ? 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png' 
                                            : 'https://maps.google.com/mapfiles/ms/icons/red-dot.png'
                                    }
                                    label={{
                                        text: driver.callsign || "",
                                        color: '#ffffff',
                                        fontWeight: 'bold',
                                        fontSize: '11px',
                                    }}
                                    title={`${driver.name} (${driver.callsign})`}
                                    onClick={() => {
                                        setTrackingDriverId(driver.id);
                                        toast.success(`Tracking ${driver.name} (${driver.callsign})`);
                                    }}
                                />
                            );
                        } catch (e) { return null; }
                    })}
                </GoogleMap>
            </div>
        </div>
    );
}
