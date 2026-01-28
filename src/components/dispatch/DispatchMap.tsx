"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix for default marker icons in Next.js
const iconRetinaUrl = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png";
const iconUrl = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png";
const shadowUrl = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png";

// @ts-expect-error: Leaflet prototype modification is required for Next.js compat
delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl,
  iconUrl,
  shadowUrl,
});

interface DispatchMapProps {
  className?: string;
  drivers?: {
    id: string;
    callsign: string;
    location: { lat: number; lng: number };
    status: string;
  }[];
}

const MapController = () => {
  const map = useMap();
  useEffect(() => {
    // In a real app, we'd fit bounds to drivers/jobs here
  }, [map]);
  return null;
}

const DispatchMap = ({ className, drivers = [] }: DispatchMapProps) => {
  return (
    <div className={className}>
      <MapContainer
        center={[51.505, -0.09]}
        zoom={12}
        scrollWheelZoom={true}
        className="h-full w-full rounded-md border-2 border-slate-300"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          //   url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" // Standard
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" // Cleaner look
        />
        <MapController />

        {drivers.map(driver => (
          driver.location ? (
            <Marker key={driver.id} position={[driver.location.lat, driver.location.lng]}>
              <Popup>
                <div className="font-bold">Driver {driver.callsign}</div>
                <div>Status: {driver.status}</div>
              </Popup>
            </Marker>
          ) : null
        ))}
      </MapContainer>
    </div>
  );
};

export default DispatchMap;
