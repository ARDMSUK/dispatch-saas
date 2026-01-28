
"use client";

import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, FeatureGroup, Polygon, useMap } from "react-leaflet";
import { EditControl } from "react-leaflet-draw";
import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";
// import L from "leaflet"; // We rely on the global L from imports usually, but react-leaflet handles most

// Fix for default marker icons in Next.js
// eslint-disable-next-line @typescript-eslint/no-explicit-any
// delete (L.Icon.Default.prototype as any)._getIconUrl;
// L.Icon.Default.mergeOptions({
//   iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
//   iconUrl: require('leaflet/dist/images/marker-icon.png'),
//   shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
// });

interface ZoneMapProps {
    color?: string;
    onPolygonComplete?: (points: { lat: number, lng: number }[]) => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    zones?: any[];
    readOnly?: boolean;
}

export default function ZoneMap({ color = "#3b82f6", onPolygonComplete, zones = [], readOnly = false }: ZoneMapProps) {
    const mapRef = useRef<any>(null);

    // Initial center (UK Approx)
    const center = { lat: 51.505, lng: -0.09 };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const onCreated = (e: any) => {
        const layer = e.layer;
        const latlngs = layer.getLatLngs()[0]; // Outer ring

        // Convert to simple array
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const points = latlngs.map((ll: any) => ({ lat: ll.lat, lng: ll.lng }));

        if (onPolygonComplete) {
            onPolygonComplete(points);
        }
    };

    return (
        <MapContainer
            center={center}
            zoom={12}
            style={{ height: "100%", width: "100%" }}
            ref={mapRef}
        >
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
    );
}
