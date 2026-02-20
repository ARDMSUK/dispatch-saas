
"use client";

import { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, FeatureGroup, Polygon, useMap } from "react-leaflet";
import { EditControl } from "react-leaflet-draw";
import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";
// import L from "leaflet"; // We rely on the global L from imports usually, but react-leaflet handles most

// Fix for default marker icons in Next.js
 
// delete (L.Icon.Default.prototype as any)._getIconUrl;
// L.Icon.Default.mergeOptions({
//   iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
//   iconUrl: require('leaflet/dist/images/marker-icon.png'),
//   shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
// });

interface ZoneMapProps {
    color?: string;
    onPolygonComplete?: (points: { lat: number, lng: number }[]) => void;
     
    zones?: any[];
    readOnly?: boolean;
}

export default function ZoneMap({ color = "#3b82f6", onPolygonComplete, zones = [], readOnly = false }: ZoneMapProps) {
    const mapRef = useRef<any>(null);

    // Initial center (UK Approx)
    const center = { lat: 51.505, lng: -0.09 };

    const [searchQuery, setSearchQuery] = useState("");
    const [isSearching, setIsSearching] = useState(false);
    const [mapCenter, setMapCenter] = useState<[number, number] | null>(null);

    // Component to handle map movement
    const MapController = ({ center }: { center: [number, number] | null }) => {
        const map = useMap();
        useEffect(() => {
            if (center) {
                map.flyTo(center, 13);
            }
        }, [center, map]);
        return null;
    };

     
    const onCreated = (e: any) => {
        const layer = e.layer;
        const latlngs = layer.getLatLngs()[0]; // Outer ring

        // Convert to simple array
         
        const points = latlngs.map((ll: any) => ({ lat: ll.lat, lng: ll.lng }));

        if (onPolygonComplete) {
            onPolygonComplete(points);
        }
    };

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;

        setIsSearching(true);
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`);
            const data = await res.json();
            if (data && data.length > 0) {
                const { lat, lon } = data[0];
                setMapCenter([parseFloat(lat), parseFloat(lon)]);
            } else {
                alert("Location not found");
            }
        } catch (error) {
            console.error("Search failed", error);
            alert("Search failed. Please try again.");
        } finally {
            setIsSearching(false);
        }
    };

    return (
        <div className="relative h-full w-full group">
            {!readOnly && (
                <div className="absolute top-4 left-14 z-[1000] bg-white p-2 rounded-md shadow-md flex gap-2 w-80">
                    <form onSubmit={handleSearch} className="flex gap-2 w-full">
                        <input
                            type="text"
                            placeholder="Search location (e.g. Bourne End)..."
                            className="flex-1 px-3 py-1 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-zinc-800"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        <button
                            type="submit"
                            disabled={isSearching}
                            className="bg-zinc-800 text-white px-3 py-1 rounded text-sm hover:bg-zinc-700 disabled:opacity-50"
                        >
                            {isSearching ? "..." : "Go"}
                        </button>
                    </form>
                </div>
            )}

            <MapContainer
                center={center}
                zoom={12}
                style={{ height: "100%", width: "100%" }}
                ref={mapRef}
            >
                <MapController center={mapCenter} />
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {!readOnly && (
                    <FeatureGroup>
                        <EditControl
                            position="topright"
                            onCreated={onCreated}
                            draw={{
                                rectangle: false,
                                circle: false,
                                circlemarker: false,
                                marker: false,
                                polyline: false,
                                polygon: {
                                    allowIntersection: false,
                                    drawError: {
                                        color: '#e1e100',
                                        message: '<strong>Oh snap!<strong> you can\'t draw that!'
                                    },
                                    shapeOptions: {
                                        color: color
                                    }
                                }
                            }}
                        />
                    </FeatureGroup>
                )}

                {/* Render existing zones */}
                {zones.map((zone) => {
                    let coords: any[] = [];
                    try {
                        coords = JSON.parse(zone.coordinates);
                    } catch (e) { console.error("Invalid zone coords", e); }

                    if (coords.length > 0) {
                        return (
                            <Polygon
                                key={zone.id}
                                positions={coords}
                                pathOptions={{ color: zone.color, fillColor: zone.color, fillOpacity: 0.2 }}
                            />
                        );
                    }
                    return null;
                })}
            </MapContainer>
        </div>
    );
}
