import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { LogOut, Building2, Calendar, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

export default async function B2BLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await auth();

    if (!session || session.user?.role !== "B2B_ADMIN") {
        redirect("/login");
    }

    return (
        <div className="flex h-screen w-full bg-zinc-950 text-white font-sans overflow-hidden">
            {/* Sidebar Navigation */}
            <aside className="w-64 border-r border-zinc-800 bg-zinc-950 flex flex-col items-start px-4 py-6 justify-between shadow-2xl z-10 shrink-0">
                <div className="w-full space-y-6">
                    {/* Header */}
                    <div className="flex flex-col gap-1 px-2 border-b border-zinc-900 pb-4">
                        <div className="flex items-center gap-2">
                            <Building2 className="w-6 h-6 text-indigo-400" />
                            <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-gray-100 to-gray-400 bg-clip-text text-transparent">Corporate Portal</span>
                        </div>
                        <span className="text-xs text-zinc-500 truncate max-w-[200px]">Account: {session.user.name}</span>
                    </div>

                    {/* Navigation Items */}
                    <nav className="flex w-full flex-col gap-1">
                        <Link href="/b2b">
                            <span className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-zinc-400 hover:text-white hover:bg-zinc-800/50 transition-colors">
                                <Calendar className="w-4 h-4" /> Bookings
                            </span>
                        </Link>
                        <Link href="/b2b/ledger">
                            <span className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-zinc-400 hover:text-white hover:bg-zinc-800/50 transition-colors">
                                <FileText className="w-4 h-4" /> Account Ledger
                            </span>
                        </Link>
                    </nav>
                </div>

                {/* Footer Section (Logout) */}
                <div className="px-2 w-full pt-4 border-t border-zinc-900">
                    <form action="/api/auth/signout" method="POST">
                        <Button
                            variant="ghost"
                            className="w-full flex items-center justify-start gap-3 rounded-md text-sm text-zinc-400 hover:text-red-400 hover:bg-red-400/10 transition-colors px-3 h-10"
                            type="submit"
                        >
                            <LogOut className="w-4 h-4" />
                            Sign out
                        </Button>
                    </form>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 overflow-y-auto bg-black relative">
                {/* Subtle gradient background effect */}
                <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-indigo-500/5 to-transparent pointer-events-none -z-0"></div>
                <div className="relative z-10 h-full p-8 max-w-7xl mx-auto flex flex-col h-full">
                    {children}
                </div>
            </main>
        </div>
    );
}
