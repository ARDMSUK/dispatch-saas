export async function getMapboxMatrix(
    pickupLat: number,
    pickupLng: number,
    drivers: { id: string; lat: number; lng: number }[]
): Promise<Record<string, { duration: number; distance: number }> | null> {
    const token = process.env.MAPBOX_ACCESS_TOKEN;
    if (!token) {
        console.warn("[MAPBOX] MAPBOX_ACCESS_TOKEN is not set. Falling back to straight-line distance.");
        return null;
    }

    if (drivers.length === 0) return {};

    try {
        // Semicolon-separated list of coordinate pairs: pickup first, then candidate drivers
        const coords = [`${pickupLng},${pickupLat}`];
        for (const driver of drivers) {
            coords.push(`${driver.lng},${driver.lat}`);
        }

        const coordsString = coords.join(';');
        
        // Sources: indexes of the drivers in the coords array (1, 2, 3...)
        const sources = drivers.map((_, index) => index + 1).join(';');
        
        // Destinations: index 0 (the pickup coordinates)
        const destinations = "0";

        const url = `https://api.mapbox.com/directions/matrix/v1/mapbox/driving/${coordsString}?sources=${sources}&destinations=${destinations}&annotations=duration,distance&access_token=${token}`;

        const res = await fetch(url);
        if (!res.ok) {
            console.error(`[MAPBOX MATRIX ERROR] API returned status ${res.status}:`, await res.text());
            return null;
        }

        const data = await res.json() as any;
        if (!data.durations || !data.distances) {
            console.error(`[MAPBOX MATRIX ERROR] Invalid API response format:`, data);
            return null;
        }

        const results: Record<string, { duration: number; distance: number }> = {};
        drivers.forEach((driver, index) => {
            // durations[index][0] maps to the source index (driver) to destination 0 (pickup)
            const duration = data.durations[index]?.[0] ?? 999999;
            const distance = data.distances[index]?.[0] ?? 999999;
            results[driver.id] = { duration, distance };
        });

        return results;
    } catch (error) {
        console.error("[MAPBOX MATRIX ERROR] Failed to fetch Mapbox Matrix:", error);
        return null;
    }
}
