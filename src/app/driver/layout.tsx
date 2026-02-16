
import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Driver App | Dispatch SaaS',
    description: 'Driver Companion App',
    viewport: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0', // Prevent zoom on mobile
};

export default function DriverLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100 antialiased selection:bg-amber-500 selection:text-black">
            {children}
        </div>
    );
}
