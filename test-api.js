const API_KEY = 'e62d41b2e706d08d7eb9ad93c728f3d4';

async function fetchFlightStatus(flightNumber, tenantApiKey) {
    if (!flightNumber) return null;

    const API_KEY = tenantApiKey || process.env.AVIATIONSTACK_API_KEY;

    if (!API_KEY) {
        console.warn("[FlightService] No AVIATIONSTACK_API_KEY found.");
        return null;
    }

    try {
        const url = `http://api.aviationstack.com/v1/flights?access_key=${API_KEY}&flight_iata=${encodeURIComponent(flightNumber)}&limit=1`;
        console.log("Fetching", url);
        const res = await fetch(url);

        if (!res.ok) {
            console.error("[FlightService] API error", await res.text());
            return null;
        }

        const data = await res.json();
        console.log("Raw Response Data:", JSON.stringify(data, null, 2));

        if (data.error) {
            console.error("[FlightService] API returned an error:", data.error.message || data.error);
            return null;
        }

        if (data && data.data && data.data.length > 0) {
            const flight = data.data[0];
            return {
                status: flight.flight_status,
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

fetchFlightStatus('BA12', API_KEY).then(console.log);
