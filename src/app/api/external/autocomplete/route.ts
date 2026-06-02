import { NextResponse } from 'next/server';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
    return NextResponse.json({}, { headers: corsHeaders });
}

// Regex to detect UK Postcodes and separate remainder
function extractPostcodeAndRemainder(query: string) {
    const postcodeRegex = /([A-Z]{1,2}[0-9][A-Z0-9]?\s*[0-9][A-Z]{2})/i;
    const match = query.match(postcodeRegex);
    if (match) {
        const postcode = match[1].trim();
        const remainder = query.replace(match[1], '').replace(/[,]/g, ' ').replace(/\s+/g, ' ').trim();
        return { postcode, remainder };
    }
    return null;
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    if (!query || query.length < 3) {
        return NextResponse.json({ results: [] }, { headers: corsHeaders });
    }

    try {
        const postcodeData = extractPostcodeAndRemainder(query);
        const osKey = process.env.OS_PLACES_API_KEY;
        const googleKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

        // --- PHASE 1: UK POSTCODE SEARCH ---
        if (postcodeData) {
            const { postcode, remainder } = postcodeData;

            if (osKey) {
                try {
                    const url = `https://api.os.uk/search/places/v1/postcode?postcode=${encodeURIComponent(postcode)}&key=${osKey}&output_srs=EPSG:4326`;
                    const res = await fetch(url, { headers: { 'User-Agent': 'Cabai/1.0' } });
                    if (res.ok) {
                        const data = await res.json();
                        if (data.results && data.results.length > 0) {
                            let matches = data.results.map((item: any) => {
                                const details = item.DPA || item.LPI;
                                return {
                                    label: details.ADDRESS,
                                    value: details.ADDRESS,
                                    lat: String(details.Y_COORDINATE),
                                    lng: String(details.X_COORDINATE),
                                    lon: String(details.X_COORDINATE)
                                };
                            });

                            // Filter locally by house name or number if specified
                            if (remainder) {
                                const normRem = remainder.toLowerCase();
                                matches = matches.filter((item: any) => 
                                    item.label.toLowerCase().includes(normRem)
                                );
                            }

                            if (matches.length > 0) {
                                return NextResponse.json({ results: matches }, { headers: corsHeaders });
                            }
                        }
                    }
                } catch (e) {
                    console.error("OS Places postcode lookup failed, falling back:", e);
                }
            }
        }

        // --- PHASE 2: TEXT & KEYWORD SEARCH ---
        // 1. Live OS Places Find API
        if (osKey) {
            try {
                const url = `https://api.os.uk/search/places/v1/find?query=${encodeURIComponent(query)}&key=${osKey}&output_srs=EPSG:4326`;
                const res = await fetch(url, { headers: { 'User-Agent': 'Cabai/1.0' } });
                if (res.ok) {
                    const data = await res.json();
                    if (data.results && data.results.length > 0) {
                        const results = data.results.map((item: any) => {
                            const details = item.DPA || item.LPI;
                            return {
                                label: details.ADDRESS,
                                value: details.ADDRESS,
                                lat: String(details.Y_COORDINATE),
                                lng: String(details.X_COORDINATE),
                                lon: String(details.X_COORDINATE)
                            };
                        });
                        return NextResponse.json({ results }, { headers: corsHeaders });
                    }
                }
            } catch (e) {
                console.error("OS Places Find lookup failed, falling back:", e);
            }
        }

        // 2. Google Maps Geocoding API Fallback
        if (googleKey) {
            try {
                const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&components=country:GB&key=${googleKey}`;
                const res = await fetch(url);
                if (res.ok) {
                    const data = await res.json();
                    if (data.status === "OK" && data.results && data.results.length > 0) {
                        const results = data.results.map((item: any) => ({
                            label: item.formatted_address,
                            value: item.formatted_address,
                            lat: String(item.geometry.location.lat),
                            lng: String(item.geometry.location.lng),
                            lon: String(item.geometry.location.lng)
                        }));
                        return NextResponse.json({ results }, { headers: corsHeaders });
                    }
                }
            } catch (e) {
                console.error("Google Geocoding failed, falling back:", e);
            }
        }

        // 3. OpenStreetMap Nominatim Fallback
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&addressdetails=1&limit=5&countrycodes=gb`;
        const res = await fetch(url, {
            headers: {
                'User-Agent': 'DispatchSaaS/1.0 (contact@dispatch-saas.com)'
            }
        });

        if (!res.ok) throw new Error('Nominatim fetch failed');

        const data = await res.json();
        const results = data.map((item: any) => ({
            label: item.display_name,
            value: item.display_name,
            lat: String(item.lat),
            lng: String(item.lon),
            lon: String(item.lon)
        }));

        return NextResponse.json({ results }, { headers: corsHeaders });

    } catch (error) {
        console.error('Autocomplete error:', error);
        return NextResponse.json({ results: [] }, { status: 500, headers: corsHeaders });
    }
}
