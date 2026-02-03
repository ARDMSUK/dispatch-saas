'use client';

import { LoadScript } from '@react-google-maps/api';
import { ReactNode } from 'react';

const LIBRARIES: ("places" | "geometry")[] = ["places", "geometry"];

export function GoogleMapsLoader({ children }: { children: ReactNode }) {
    return (
        <LoadScript
            googleMapsApiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''}
            libraries={LIBRARIES}
        >
            {children}
        </LoadScript>
    );
}
