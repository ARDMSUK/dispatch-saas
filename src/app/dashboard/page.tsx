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
        fetchFleet();
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

    // Auto-fit bounds
    useEffect(() => {
        if (!map || drivers.length === 0) return;

        const bounds = new google.maps.LatLngBounds();
        let hasValidLoc = false;

        drivers.forEach(d => {
            if (d.location) {
                try {
                    const pos = JSON.parse(d.location);
                    if (pos.lat && pos.lng) {
                        bounds.extend(pos);
                        hasValidLoc = true;
                    }
                } catch (e) { }
            }
        });

        // Also include tenant location if available
        if (user?.tenant?.lat && user?.tenant?.lng) {
            bounds.extend({ lat: user.tenant.lat, lng: user.tenant.lng });
            hasValidLoc = true;
        }

        if (hasValidLoc) {
            map.fitBounds(bounds);
            // Optional: Adjust zoom if only 1 point?
        }
    }, [map, drivers, user]);

    return (
        <div className="h-full w-full bg-black text-white flex font-sans overflow-hidden">

            {/* 3-COLUMN LAYOUT */}

            {/* COL 1: NEW BOOKING (Fixed Width) */}
            <div className="w-[380px] border-r border-white/5 bg-black h-full flex flex-col z-20 shadow-2xl shrink-0">
                <div className="p-4 border-b border-white/5 bg-zinc-950/50">
                    {/* Header Removed */}
                </div>
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                    <BookingForm onJobCreated={triggerRefresh} />
                </div>
            </div>

            {/* COL 2: BOOKING MANAGER (Flex Grow) */}
            <div className="flex-1 border-r border-white/5 bg-zinc-900/20 h-full relative z-10 flex flex-col min-w-[400px]">
                <BookingManager
                    onSelectJob={(j) => setSelectedJob(j)}
                    selectedJobId={selectedJob?.id}
                    refreshTrigger={refreshTrigger}
                />
            </div>

            {/* COL 3: MAP & FLEET (Fixed Width) */}
            <div className="w-[450px] flex flex-col h-full bg-zinc-950 border-l border-white/5 z-20 shrink-0">

                {/* TOP: MAP (50%) */}
                <div className="h-1/2 relative bg-zinc-900 border-b border-white/5">
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
                            styles: DARK_MAP_STYLE,
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
                                            path: "M17 6c0 5.5-7 15-7 15S3 11.5 3 6a7 7 0 1 1 14 0z",
                                            fillColor: driver.status === 'ONLINE' ? '#10b981' : driver.status === 'BUSY' ? '#f59e0b' : '#ef4444',
                                            fillOpacity: 1,
                                            strokeWeight: 1, // White border
                                            strokeColor: '#ffffff',
                                            scale: 1.5,
                                            labelOrigin: { x: 7, y: -10 } as any // Google types can be tricky
                                        }}
                                        title={`${driver.name} (${driver.callsign})`}
                                    />
                                );
                            } catch (e) { return null; }

                        })}
                    </GoogleMap>

                    {/* Map Info Overlay */}
                    <div className="absolute top-4 right-4 bg-zinc-900/90 backdrop-blur border border-white/10 p-2 rounded text-xs font-mono text-zinc-400 shadow-xl pointer-events-none">
                        London Live View
                    </div>
                </div>

                {/* BOTTOM: DRIVER FLEET (50%) */}
                <div className="h-1/2 flex flex-col overflow-hidden bg-black">
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
