
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    if (!query || query.length < 3) {
        return NextResponse.json({ results: [] });
    }

    try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&addressdetails=1&limit=5&countrycodes=gb`;

        const res = await fetch(url, {
            headers: {
                'User-Agent': 'DispatchSaaS/1.0 (contact@dispatch-saas.com)'
            }
        });

        if (!res.ok) throw new Error('Nominatim fetch failed');

        const data = await res.json();

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const results = data.map((item: any) => ({
            label: item.display_name,
            value: item.display_name,
            lat: item.lat,
            lon: item.lon
        }));

        return NextResponse.json({ results });
    } catch (error) {
        console.error('Autocomplete error:', error);
        return NextResponse.json({ results: [] });
    }
}
