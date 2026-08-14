
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

export async function getGoogleRouteDistance(start: LatLng, end: LatLng): Promise<{ distanceMiles: number, durationMins: number } | null> {
    try {
        const apiKey = process.env.GOOGLE_MAPS_SERVER_API_KEY;
        if (!apiKey) {
            console.warn("[Geocoding] GOOGLE_MAPS_SERVER_API_KEY is missing. Cannot use Google Routes API.");
            return null;
        }

        const url = 'https://routes.googleapis.com/directions/v2:computeRoutes';
        
        const payload = {
            origin: { location: { latLng: { latitude: start.lat, longitude: start.lng } } },
            destination: { location: { latLng: { latitude: end.lat, longitude: end.lng } } },
            travelMode: 'DRIVE'
        };

        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Goog-Api-Key': apiKey,
                'X-Goog-FieldMask': 'routes.distanceMeters,routes.duration'
            },
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            console.error(`[Geocoding] Google Routes API failed with status ${res.status}`);
            return null;
        }

        const data = await res.json();
        
        if (data.routes && data.routes.length > 0) {
            const route = data.routes[0];
            const distanceMeters = route.distanceMeters || 0;
            let durationSeconds = 0;
            if (route.duration) {
                durationSeconds = parseInt(route.duration.replace('s', ''), 10) || 0;
            }

            return {
                distanceMiles: distanceMeters * 0.000621371,
                durationMins: Math.ceil(durationSeconds / 60)
            };
        }

        return null;
    } catch (error) {
        console.error("[Geocoding] Google Routes error:", error);
        return null;
    }
}

export async function getAuthoritativeDistance(pickupLat?: number, pickupLng?: number, dropoffLat?: number, dropoffLng?: number, vias?: any[]): Promise<number | undefined> {
    if (pickupLat == null || pickupLng == null || dropoffLat == null || dropoffLng == null) {
        return undefined;
    }
    if (vias && vias.length > 0) {
        throw new Error('Route pricing with intermediary stops (vias) cannot currently be calculated by this endpoint.');
    }
    const googleRoute = await getGoogleRouteDistance({ lat: pickupLat, lng: pickupLng }, { lat: dropoffLat, lng: dropoffLng });
    if (googleRoute && googleRoute.distanceMiles > 0) {
        return googleRoute.distanceMiles;
    }
    const osrmRoute = await getRouteDistance({ lat: pickupLat, lng: pickupLng }, { lat: dropoffLat, lng: dropoffLng });
    if (osrmRoute && osrmRoute.distanceMiles > 0) {
        return osrmRoute.distanceMiles;
    }
    throw new Error('Unable to calculate road distance at the moment. Please try again.');
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
