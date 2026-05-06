export async function fetchFlightStatus(flightNumber: string, tenantApiKey?: string | null) {
    if (!flightNumber) return null;

    // Use AviationStack for real-time data. Use tenant key if available, else fallback to global env
    const API_KEY = tenantApiKey || process.env.AVIATIONSTACK_API_KEY;

    if (!API_KEY) {
        console.warn("[FlightService] No AVIATIONSTACK_API_KEY found.");
        return null;
    }

    try {
        const res = await fetch(`http://api.aviationstack.com/v1/flights?access_key=${API_KEY}&flight_iata=${encodeURIComponent(flightNumber)}&limit=1`, {
            next: { revalidate: 300 } // Cache for 5 mins
        });

        if (!res.ok) {
            console.error("[FlightService] API error", await res.text());
            return null;
        }

        const data = await res.json();

        // Handle cases where API returns 200 OK but body contains an error (e.g., missing API key)
        if (data.error) {
            console.error("[FlightService] API returned an error:", data.error.message || data.error);
            return null;
        }

        if (data && data.data && data.data.length > 0) {
            const flight = data.data[0];
            return {
                status: flight.flight_status, // scheduled, active, landed, cancelled, incident, diverted
                scheduledArrival: flight.arrival.scheduled,
                estimatedArrival: flight.arrival.estimated || flight.arrival.scheduled,
                actualArrival: flight.arrival.actual,
                airline: flight.airline.name,
                terminal: flight.arrival.terminal,
                gate: flight.arrival.gate,
                baggage: flight.arrival.baggage
            };
        }

        console.warn(`[FlightService] No real flight data found for ${flightNumber}.`);
        return null;

    } catch (e) {
        console.error("[FlightService] Failed to fetch flight data", e);
        return null;
    }
}
