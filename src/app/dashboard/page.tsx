'use client';

import { useState, useCallback, useEffect } from 'react';
import { GoogleMap, MarkerF } from '@react-google-maps/api';
import { ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/utils/supabase/client';

import { BookingForm } from '@/components/dashboard/booking-form';
import { BookingManager } from '@/components/dashboard/booking-manager';
import { BookingManagerClassic } from '@/components/dashboard/booking-manager-classic';
import { DriverFleetPanel } from '@/components/dashboard/driver-fleet-panel';

const LONDON_CENTER = { lat: 51.5074, lng: -0.1278 };
const LIBRARIES: ("places" | "geometry")[] = ["places", "geometry"];

const isDriverOnline = (driver: any) => {
    if (driver.status === 'OFF_DUTY') return false;
    if (!driver.lastLocationUpdate) return true;
    const lastUpdate = new Date(driver.lastLocationUpdate).getTime();
    return (Date.now() - lastUpdate) < 5 * 60 * 1000;
};

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

import { Suspense } from 'react';

function DashboardContent() {
    // State
    const [selectedJob, setSelectedJob] = useState<any | null>(null);
    const [user, setUser] = useState<any>(null);
    const [drivers, setDrivers] = useState<any[]>([]);
    const [vehicles, setVehicles] = useState<any[]>([]);

    // Refresh triggers
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const triggerRefresh = useCallback(() => setRefreshTrigger(p => p + 1), []);

    useEffect(() => {
        // Fetch current user/tenant details for map center
        fetch('/api/settings/organization')
            .then(res => res.json())
            .then(data => {
                if (data && data.lat) {
                    setUser({ tenant: data });
                }
            })
            .catch(console.error);
    }, []);

    useEffect(() => {
        const fetchFleet = async () => {
            try {
                const [driverRes, vehicleRes] = await Promise.all([
                    fetch('/api/drivers'),
                    fetch('/api/vehicles')
                ]);
                if (driverRes.ok) setDrivers(await driverRes.json());
                if (vehicleRes.ok) setVehicles(await vehicleRes.json());
            } catch (error) {
                console.error("Failed to load fleet", error);
            }
        };

        fetchFleet(); // Initial load

        // Poll for driver status updates every 15 seconds
        const interval = setInterval(() => {
            fetchFleet();
        }, 15000);

        return () => clearInterval(interval);
    }, [refreshTrigger]);

    // WebSocket real-time subscription for driver coordinates
    useEffect(() => {
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        if (!url || !key) {
            console.warn("[Dashboard WebSockets] Supabase URL or Anon Key is missing. Real-time driver location tracking is disabled.");
            return;
        }

        try {
            const supabase = createClient();
            const channel = supabase.channel('drivers-location');

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

            channel.subscribe((status) => {
                console.log(`[Supabase Dashboard] Realtime subscription status: ${status}`);
            });

            return () => {
                supabase.removeChannel(channel);
            };
        } catch (err) {
            console.error("[Dashboard WebSockets] Failed to subscribe to location updates:", err);
        }
    }, []);

    const handleAssignDriver = async (driverId: string) => {
        if (!selectedJob) return;

        const promise = fetch(`/api/jobs/${selectedJob.id}/assign`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ driverId })
        }).then(async (res) => {
            if (!res.ok) throw new Error("Assignment failed");
            triggerRefresh(); // Refresh lists
            setSelectedJob(null); // Clear selection
        });

        toast.promise(promise, {
            loading: 'Dispatching job...',
            success: 'Driver assigned successfully!',
            error: 'Failed to assign driver'
        });
    };

    // Map State
    const [map, setMap] = useState<google.maps.Map | null>(null);

    const onLoad = useCallback((map: google.maps.Map) => {
        setMap(map);
    }, []);

    const onUnmount = useCallback(() => {
        setMap(null);
    }, []);

    // Map Search
    const [mapSearchTerm, setMapSearchTerm] = useState('');
    const [trackingDriverId, setTrackingDriverId] = useState<string | null>(null);

    const handleSearchMap = () => {
        if (!map || !mapSearchTerm) return;
        const driver = drivers.find(d => 
            d.callsign?.toLowerCase() === mapSearchTerm.toLowerCase() || 
            d.name?.toLowerCase().includes(mapSearchTerm.toLowerCase()) ||
            d.callsign?.toLowerCase().includes(mapSearchTerm.toLowerCase())
        );
        
        if (driver && isDriverOnline(driver)) {
            try {
                let pos = null;
                if (driver.currentLat && driver.currentLng) {
                    pos = { lat: driver.currentLat, lng: driver.currentLng };
                } else if (driver.location) {
                    pos = JSON.parse(driver.location);
                }

                if (pos && pos.lat && pos.lng) {
                    map.panTo(pos);
                    map.setZoom(15);
                    setTrackingDriverId(driver.id); // Start tracking
                    toast.success(`Tracking ${driver.name} (${driver.callsign})`);
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

    // Auto-fit bounds
    useEffect(() => {
        if (!map || drivers.length === 0) return;

        // If we are tracking a specific driver, keep them centered instead of fitting bounds
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

        drivers.filter(isDriverOnline).forEach(d => {
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
            } catch (e) { }
        });

        // Only fit bounds if we actually have drivers to show.
        // If we only have the tenant location, we prefer to respect the default zoom/center 
        // rather than zooming in aggressively on a single point.
        if (hasDriverLoc) {
            // Include tenant location for context (so meaningful relative position is shown)
            if (user?.tenant?.lat && user?.tenant?.lng) {
                bounds.extend({ lat: user.tenant.lat, lng: user.tenant.lng });
            }
            map.fitBounds(bounds);
        }
    }, [map, drivers, user, trackingDriverId]);

    const isClassicLayout = user?.tenant?.consoleLayout === 'CLASSIC';

    // Shared Map Rendering
    const mapComponent = (
        <div className="h-full w-full relative bg-slate-100">
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
                    disableDefaultUI: true,
                    zoomControl: true,
                }}
            >
                {/* MARKERS */}
                {drivers.filter(isDriverOnline).map(driver => {
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
                            />
                        );
                    } catch (e) { return null; }

                })}
            </GoogleMap>

            {/* Map Search Overlay */}
            <div className="absolute top-4 left-4 right-14 flex gap-2 z-10">
                <input
                    type="text"
                    placeholder="Search Driver (Callsign or Name)..."
                    className="flex-1 bg-white border border-slate-200 rounded p-2 text-sm text-slate-900 shadow focus:outline-none"
                    value={mapSearchTerm}
                    onChange={e => setMapSearchTerm(e.target.value)}
                    onKeyDown={e => {
                        if (e.key === 'Enter') {
                            handleSearchMap();
                        }
                    }}
                />
                <button 
                    className="bg-blue-500 text-white px-4 rounded text-sm shadow hover:bg-indigo-600"
                    onClick={handleSearchMap}
                >
                    Find
                </button>
                <button
                    className="bg-zinc-800 text-white p-2 rounded text-sm shadow hover:bg-zinc-700 flex items-center justify-center cursor-pointer shrink-0"
                    onClick={() => window.open('/dashboard/map', '_blank')}
                    title="Open Standalone Map on Second Screen"
                >
                    <ExternalLink className="w-4 h-4" />
                </button>
            </div>
        </div>
    );

    // Shared Fleet Panel
    const fleetComponent = (
        <DriverFleetPanel
            drivers={drivers}
            vehicles={vehicles}
            onRefresh={triggerRefresh}
            onAssign={handleAssignDriver}
            selectedJobId={selectedJob?.id?.toString()}
        />
    );

    const classicView = (
        <div className="hidden lg:flex h-full w-full max-w-[100vw] bg-slate-50 text-slate-900 flex-row font-sans overflow-hidden relative">
            {/* COL 1: NEW BOOKING (Full Height) */}
            <div className="w-[420px] border-r border-slate-200 bg-slate-50 h-full flex flex-col z-20 shrink-0">
                <div className="flex-1 overflow-hidden p-4 flex flex-col h-full">
                    <BookingForm onJobCreated={triggerRefresh} />
                </div>
            </div>

            {/* COL 2: RIGHT SIDE (Fleet, Map, Jobs) */}
            <div className="flex-1 h-full flex flex-col overflow-hidden bg-slate-100/50">
                {/* TOP HALF: MAP & FLEET */}
                <div className="flex w-full h-[45vh] border-b border-slate-200 shrink-0 bg-white">
                    {/* MAP (Left) */}
                    <div className="flex-1 bg-slate-100 relative">
                        {mapComponent}
                    </div>

                    {/* FLEET MANAGEMENT (Right) */}
                    <div className="w-[350px] border-l border-slate-200 bg-slate-50 h-full flex flex-col shrink-0 overflow-y-auto">
                        {fleetComponent}
                    </div>
                </div>

                {/* BOTTOM HALF: COMPACT CARDS LIST */}
                <div className="flex-1 relative z-10 flex flex-col overflow-hidden">
                    <BookingManagerClassic
                        onSelectJob={(j) => setSelectedJob(j)}
                        selectedJobId={selectedJob?.id}
                        refreshTrigger={refreshTrigger}
                    />
                </div>
            </div>
        </div>
    );

    const modernView = (
        <div className={`h-full w-full max-w-[100vw] bg-slate-50 text-slate-900 flex flex-col lg:flex-row font-sans overflow-x-hidden overflow-y-auto lg:overflow-hidden relative ${isClassicLayout ? 'lg:hidden' : ''}`}>

            {/* 3-COLUMN LAYOUT */}

            {/* COL 1: NEW BOOKING */}
            <div className="w-full max-w-[100vw] lg:w-[420px] border-b lg:border-b-0 lg:border-r border-slate-200 bg-slate-50 lg:h-full flex flex-col z-20 shadow-xl shrink-0 min-h-[600px] lg:min-h-0 overflow-x-hidden">
                <div className="p-4 border-b border-slate-200 bg-white hidden lg:block">
                    {/* Empty header block to match alignments if needed */}
                </div>
                <div className="flex-1 overflow-y-visible lg:overflow-hidden p-4 lg:flex lg:flex-col lg:h-full">
                    <BookingForm onJobCreated={triggerRefresh} />
                </div>
            </div>

            {/* COL 2: BOOKING MANAGER */}
            <div className="w-full max-w-[100vw] lg:flex-1 border-b lg:border-b-0 lg:border-r border-slate-200 bg-zinc-900/20 lg:h-full relative z-10 flex flex-col min-w-[300px] lg:min-w-[400px] min-h-[800px] lg:min-h-0 overflow-x-hidden">
                <BookingManager
                    onSelectJob={(j) => setSelectedJob(j)}
                    selectedJobId={selectedJob?.id}
                    refreshTrigger={refreshTrigger}
                />
            </div>

            {/* COL 3: MAP & FLEET */}
            <div className="w-full lg:w-[450px] flex flex-col h-[800px] lg:h-full bg-white border-l border-slate-200 z-20 shrink-0">

                {/* TOP: MAP (50%) */}
                <div className="h-1/2 relative bg-slate-100 border-b border-slate-200">
                    {mapComponent}
                </div>

                {/* BOTTOM: DRIVER FLEET (50%) */}
                <div className="h-1/2 flex flex-col overflow-hidden bg-slate-50">
                    {fleetComponent}
                </div>

            </div>
        </div>
    );

    return (
        <>
            {isClassicLayout && classicView}
            {modernView}
        </>
    );
}

export default function DashboardPage() {
    return (
        <Suspense fallback={<div className="h-full w-full flex items-center justify-center bg-slate-50"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div></div>}>
            <DashboardContent />
        </Suspense>
    );
}
