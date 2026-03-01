"use client";

import { useEffect } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet.heat";

interface HeatmapLayerProps {
    data: { lat: number; lng: number; weight: number }[];
}

export const HeatmapLayer = ({ data }: HeatmapLayerProps) => {
    const map = useMap();

    useEffect(() => {
        if (!map || data.length === 0) return;

        // Convert data to Leaflet format [lat, lng, intensity]
        const heatData = data.map((d) => [d.lat, d.lng, d.weight] as [number, number, number]);

        // @ts-ignore: leaflet.heat plugin extends L but types are sometimes incomplete
        const heatLayer = L.heatLayer(heatData, {
            radius: 25,
            blur: 15,
            maxZoom: 15,
            gradient: {
                0.4: "blue",
                0.6: "cyan",
                0.7: "lime",
                0.8: "yellow",
                1.0: "red"
            }
        });

        heatLayer.addTo(map);

        return () => {
            map.removeLayer(heatLayer);
        };
    }, [map, data]);

    return null;
};
