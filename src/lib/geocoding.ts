
// Basic Geocoding and Routing Services (Mock or External API)

// Using OpenStreetMap (Nominatim) for Geocoding
// Using OSRM (Open Source Routing Machine) for Routing

// Note: These public APIs have Usage Limits. 
// For production, use Mapbox, Google Maps, or a self-hosted OSRM instance.

interface LatLng {
    lat: number;
    lng: number;
}

export async function geocodeAddress(address: string): Promise<LatLng | null> {
    try {
        console.log(`[Geocoding] Lookup: ${address}`);
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`;

        const res = await fetch(url, {
            headers: {
                'User-Agent': 'DispatchSaaS/1.0 (contact@example.com)' // Nominatim requires User-Agent
            }
        });

        if (!res.ok) throw new Error('Geocoding failed');

        const data = await res.json();
        if (data && data.length > 0) {
            return {
                lat: parseFloat(data[0].lat),
                lng: parseFloat(data[0].lon)
            };
        }

        return null;
    } catch (error) {
        console.error("Geocoding error:", error);
        return null;
    }
}

export async function getRouteDistance(start: LatLng, end: LatLng): Promise<{ distanceMiles: number, durationMins: number } | null> {
    try {
        // OSRM expects: longitude,latitude;longitude,latitude
        const coords = `${start.lng},${start.lat};${end.lng},${end.lat}`;
        const url = `http://router.project-osrm.org/route/v1/driving/${coords}?overview=false`;

        const res = await fetch(url);
        if (!res.ok) throw new Error('Routing failed');

        const data = await res.json();

        if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
            const route = data.routes[0];
            const distanceMeters = route.distance;
            const durationSeconds = route.duration;

            return {
                distanceMiles: distanceMeters * 0.000621371,
                durationMins: Math.ceil(durationSeconds / 60)
            };
        }

        return null; // Fallback
    } catch (error) {
        console.error("Routing error:", error);
        return null;
    }
}

// Ray Casting Algorithm to check if point is in polygon
export function isPointInZone(point: LatLng, polygon: LatLng[]): boolean {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const xi = polygon[i].lat, yi = polygon[i].lng;
        const xj = polygon[j].lat, yj = polygon[j].lng;

        const intersect = ((yi > point.lng) !== (yj > point.lng))
            && (point.lat < (xj - xi) * (point.lng - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
}
