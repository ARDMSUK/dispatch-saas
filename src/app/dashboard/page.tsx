'use client';

import { useState, useCallback, useEffect } from 'react';
import { GoogleMap, MarkerF } from '@react-google-maps/api';
import { toast } from 'sonner';

import { BookingForm } from '@/components/dashboard/booking-form';
import { BookingManager } from '@/components/dashboard/booking-manager';
import { DriverFleetPanel } from '@/components/dashboard/driver-fleet-panel';

// MAP CONSTANTS
const LONDON_CENTER = { lat: 51.5074, lng: -0.1278 };
const LIBRARIES: ("places" | "geometry")[] = ["places", "geometry"];

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

export default function DashboardPage() {
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

    const handleSearchMap = () => {
        if (!map || !mapSearchTerm) return;
        const driver = drivers.find(d => 
            d.callsign?.toLowerCase() === mapSearchTerm.toLowerCase() || 
            d.name?.toLowerCase().includes(mapSearchTerm.toLowerCase()) ||
            d.callsign?.toLowerCase().includes(mapSearchTerm.toLowerCase())
        );
        
        if (driver && driver.location) {
            try {
                const pos = JSON.parse(driver.location);
                if (pos.lat && pos.lng) {
                    map.panTo(pos);
                    map.setZoom(15);
                    toast.success(`Found ${driver.name} (${driver.callsign})`);
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

        const bounds = new google.maps.LatLngBounds();
        let hasDriverLoc = false;

        drivers.forEach(d => {
            if (d.location) {
                try {
                    const pos = JSON.parse(d.location);
                    if (pos.lat && pos.lng) {
                        bounds.extend(pos);
                        hasDriverLoc = true;
                    }
                } catch (e) { }
            }
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
    }, [map, drivers, user]);

    return (
        <div className="h-full w-full max-w-[100vw] bg-slate-50 text-slate-900 flex flex-col lg:flex-row font-sans overflow-x-hidden overflow-y-auto lg:overflow-hidden relative">

            {/* 3-COLUMN LAYOUT */}

            {/* COL 1: NEW BOOKING (Fixed Width on Desktop, Max Width on Mobile) */}
            <div className="w-full max-w-[100vw] lg:w-[380px] border-b lg:border-b-0 lg:border-r border-slate-200 bg-slate-50 lg:h-full flex flex-col z-20 shadow-xl shrink-0 min-h-[600px] lg:min-h-0 overflow-x-hidden">
                <div className="p-4 border-b border-slate-200 bg-white hidden lg:block">
                    {/* Empty header block to match alignments if needed */}
                </div>
                <div className="flex-1 overflow-y-visible lg:overflow-y-auto p-4 custom-scrollbar">
                    <BookingForm onJobCreated={triggerRefresh} />
                </div>
            </div>

            {/* COL 2: BOOKING MANAGER (Flex Grow, takes remaining space on Desktop) */}
            <div className="w-full max-w-[100vw] lg:flex-1 border-b lg:border-b-0 lg:border-r border-slate-200 bg-zinc-900/20 lg:h-full relative z-10 flex flex-col min-w-[300px] lg:min-w-[400px] min-h-[800px] lg:min-h-0 overflow-x-hidden">
                <BookingManager
                    onSelectJob={(j) => setSelectedJob(j)}
                    selectedJobId={selectedJob?.id}
                    refreshTrigger={refreshTrigger}
                />
            </div>

            {/* COL 3: MAP & FLEET (Fixed Width on Desktop) */}
            <div className="w-full lg:w-[450px] flex flex-col h-[800px] lg:h-full bg-white border-l border-slate-200 z-20 shrink-0">

                {/* TOP: MAP (50%) */}
                <div className="h-1/2 relative bg-slate-100 border-b border-slate-200">
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
                        {drivers.map(driver => {
                            if (!driver.location) return null;
                            try {
                                const pos = JSON.parse(driver.location);
                                return (
                                    <MarkerF
                                        key={driver.id}
                                        position={pos}
                                        icon={{
                                            path: "M 0, 0 m -10, 0 a 10,10 0 1,0 20,0 a 10,10 0 1,0 -20,0",
                                            fillColor: driver.status === 'ONLINE' ? '#10b981' : driver.status === 'BUSY' ? '#3b82f6' : '#ef4444',
                                            fillOpacity: 1,
                                            strokeWeight: 2,
                                            strokeColor: '#ffffff',
                                            scale: 1.2,
                                            labelOrigin: { x: 0, y: 0 } as any
                                        }}
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
                            className="bg-blue-600 text-white px-4 rounded text-sm shadow hover:bg-blue-700"
                            onClick={handleSearchMap}
                        >
                            Find
                        </button>
                    </div>
                </div>

                {/* BOTTOM: DRIVER FLEET (50%) */}
                <div className="h-1/2 flex flex-col overflow-hidden bg-slate-50">
                    <DriverFleetPanel
                        drivers={drivers}
                        vehicles={vehicles}
                        onRefresh={triggerRefresh}
                        onAssign={handleAssignDriver}
                        selectedJobId={selectedJob?.id?.toString()}
                    />
                </div>

            </div>
        </div>
    );
}
