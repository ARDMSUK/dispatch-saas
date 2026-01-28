import Link from "next/link";
import { Button } from "@/components/ui/button";
import { User, Settings, Shield, Bell, MessageSquare, Phone } from "lucide-react";

import { auth } from "@/auth";

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await auth();
    const userName = session?.user?.name || "Operator";
    const tenantSlug = session?.user?.tenantSlug || "Unknown";

    return (
        <div className="flex min-h-screen flex-col bg-background text-foreground">
            {/* Top Bar: System Status & User Info */}
            <header className="flex h-10 items-center justify-between bg-zinc-900 px-4 text-xs font-medium text-white shadow-sm">
                <div className="flex items-center gap-4">
                    <span className="font-bold text-green-400 uppercase">{tenantSlug}</span>
                    <span className="text-zinc-400">EXT: 1005</span>
                    <span className="flex items-center gap-1 text-green-500"><div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div> ONLINE</span>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-zinc-400">Logged in as: <span className="text-white font-bold">{userName}</span></span>
                    <form action={async () => {
                        "use server";
                        await import("@/auth").then(m => m.signOut());
                    }}>
                        <Button variant="destructive" size="sm" className="h-7 text-xs px-2">Sign Out</Button>
                    </form>
                </div>
            </header>

            {/* Main Navigation Bar */}
            <div className="flex h-12 items-center justify-between border-b bg-zinc-800 px-2 shadow-md">
                <div className="flex items-center gap-1">
                    <Button variant="secondary" className="h-9 gap-2 bg-zinc-700 text-zinc-100 hover:bg-zinc-600">
                        <Phone className="h-4 w-4" /> OPERATOR
                    </Button>
                    <Button variant="ghost" className="h-9 text-zinc-300 hover:text-white">
                        <Settings className="h-4 w-4 mr-2" /> MANAGE
                    </Button>
                    <Button variant="ghost" className="h-9 text-zinc-300 hover:text-white">
                        <Shield className="h-4 w-4 mr-2" /> ADMIN
                    </Button>
                </div>
                <div className="flex items-center gap-2 pr-2">
                    {/* Quick Actions */}
                    <Button variant="outline" size="sm" className="h-8 border-zinc-600 bg-zinc-900 text-zinc-300 hover:bg-zinc-800">What&apos;s New</Button>
                </div>
            </div>

            {/* Sub-Navigation Tabs (The "Dispatch/Bookings" row) */}
            <div className="flex h-10 items-end border-b bg-zinc-100 px-4 gap-1 overflow-x-auto">
                <TabLink href="/dashboard" active>DISPATCH</TabLink>
                <TabLink href="/dashboard/bookings">BOOKINGS</TabLink>
                <TabLink href="/dashboard/drivers">DRIVERS</TabLink>
                <TabLink href="/dashboard/vehicles">VEHICLES</TabLink>
                <TabLink href="/dashboard/accounts">ACCOUNTS</TabLink>
                <TabLink href="/dashboard/pricing">PRICING</TabLink>
                <TabLink href="/dashboard/zones">ZONES</TabLink>
                <TabLink href="/dashboard/logs">LOGS</TabLink>
            </div>

            {/* Main Workspace */}
            <main className="flex-1 overflow-hidden bg-zinc-200/50 p-2">
                {children}
            </main>
        </div>
    );
}

function TabLink({ href, children, active }: { href: string; children: React.ReactNode; active?: boolean }) {
    return (
        <Link href={href} className={`
            flex h-9 items-center px-6 text-sm font-bold border-t border-x rounded-t-md transition-colors
            ${active
                ? "bg-zinc-600 text-white border-zinc-600"
                : "bg-zinc-200 text-zinc-600 border-zinc-300 hover:bg-zinc-300"}
        `}>
            {children}
        </Link>
    )
}
