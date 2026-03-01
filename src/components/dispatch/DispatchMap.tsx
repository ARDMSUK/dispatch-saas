"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { HeatmapLayer } from "./HeatmapLayer";
import { Button } from "@/components/ui/button";
import { Layers } from "lucide-react";

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
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [heatmapData, setHeatmapData] = useState<{ lat: number; lng: number; weight: number }[]>([]);

  useEffect(() => {
    if (showHeatmap && heatmapData.length === 0) {
      // Fetch once when toggled on
      fetch('/api/dispatch/heatmap?hours=6')
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setHeatmapData(data.data);
          }
        })
        .catch(console.error);
    }
  }, [showHeatmap, heatmapData.length]);

  return (
    <div className={`relative ${className}`}>
      {/* Map Controls Overlay */}
      <div className="absolute top-4 right-4 z-[400] bg-zinc-900/90 backdrop-blur-sm p-2 rounded-lg border border-white/10 shadow-xl">
        <Button
          variant={showHeatmap ? "default" : "outline"}
          size="sm"
          onClick={() => setShowHeatmap(!showHeatmap)}
          className={`flex items-center gap-2 ${showHeatmap ? 'bg-orange-600 hover:bg-orange-700 text-white border-transparent' : 'bg-black/50 hover:bg-white/10 text-zinc-300 border-white/10'}`}
        >
          <Layers className="h-4 w-4" />
          {showHeatmap ? 'Demand Heatmap On' : 'Show Demand Heatmap'}
        </Button>
      </div>

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

        {showHeatmap && heatmapData.length > 0 && (
          <HeatmapLayer data={heatmapData} />
        )}

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
