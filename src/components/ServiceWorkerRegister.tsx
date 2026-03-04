'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';

export default function ServiceWorkerRegister() {
    const { status } = useSession();

    useEffect(() => {
        // Only register SW in production or if needed
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', function () {
                navigator.serviceWorker.register('/sw.js').then(
                    function (registration) {
                        console.log('ServiceWorker registration successful with scope: ', registration.scope);
                    },
                    function (err) {
                        console.log('ServiceWorker registration failed: ', err);
                    }
                );
            });
        }
    }, []);

    // Poll the manifest if authenticated
    useEffect(() => {
        if (status !== 'authenticated') return;

        const fetchManifest = async () => {
            try {
                const res = await fetch('/api/offline/manifest');
                if (res.ok) {
                    const data = await res.json();
                    // Store securely in localStorage
                    localStorage.setItem('dispatch_offline_manifest', JSON.stringify(data));
                    localStorage.setItem('dispatch_offline_last_sync', new Date().toISOString());
                }
            } catch (e) {
                // silent fail, don't spam console if network drops briefly
            }
        };

        // Fetch immediately
        fetchManifest();

        // Fetch every 5 minutes
        const interval = setInterval(fetchManifest, 1000 * 60 * 5);
        return () => clearInterval(interval);
    }, [status]);

    return null; // Invisible component
}
