export async function fetchFlightStatus(flightNumber: string) {
    if (!flightNumber) return null;

    // Use AviationStack for real-time data
    const API_KEY = process.env.AVIATIONSTACK_API_KEY;

    if (!API_KEY) {
        console.warn("[FlightService] No AVIATIONSTACK_API_KEY found, returning mock data");
        // Mock data logic for testing without an API key
        return getMockFlightData(flightNumber);
    }

    try {
        const res = await fetch(`http://api.aviationstack.com/v1/flights?access_key=${API_KEY}&flight_iata=${encodeURIComponent(flightNumber)}&limit=1`, {
            next: { revalidate: 300 } // Cache for 5 mins
        });

        if (!res.ok) {
            console.error("[FlightService] API error", await res.text());
            return getMockFlightData(flightNumber);
        }

        const data = await res.json();

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

        // If no data found for some reason, fallback to mock to prevent crashing dashboard
        return getMockFlightData(flightNumber);

    } catch (e) {
        console.error("[FlightService] Failed to fetch flight data", e);
        return getMockFlightData(flightNumber);
    }
}

function getMockFlightData(flightNumber: string) {
    // Generate deterministic mock data based on the flight number
    const hash = flightNumber.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);

    // Base it off current time
    const now = new Date();
    const scheduled = new Date(now.getTime() + (1000 * 60 * 60 * 2)); // 2 hours from now

    // Add artificial delay for some flights based on hash
    const delayMinutes = (hash % 5 === 0) ? 45 : 0;
    const estimated = new Date(scheduled.getTime() + (delayMinutes * 60000));

    return {
        status: delayMinutes > 0 ? 'active (delayed)' : 'scheduled',
        scheduledArrival: scheduled.toISOString(),
        estimatedArrival: estimated.toISOString(),
        actualArrival: null,
        airline: "Mock Airlines",
        terminal: "5",
        gate: "A12",
        baggage: "Carousel 3",
        _isMock: true
    };
}
