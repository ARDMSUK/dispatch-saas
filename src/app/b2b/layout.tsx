import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { LogOut, Building2, Calendar, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";

export default async function B2BLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await auth();

    if (!session || session.user?.role !== "B2B_ADMIN") {
        redirect("/login");
    }


    const tenant = await prisma.tenant.findUnique({
        where: { id: session.user.tenantId! },
        select: { subscriptionStatus: true }
    });

    if (tenant && (tenant.subscriptionStatus === "PAST_DUE" || tenant.subscriptionStatus === "CANCELED")) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-slate-50 text-slate-900 font-sans">
                <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center space-y-4">
                    <h2 className="text-2xl font-bold text-red-600">Portal Suspended</h2>
                    <p className="text-slate-600">
                        Corporate booking access is temporarily suspended due to a platform billing issue. Please contact your transport provider.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen w-full bg-white text-slate-900 font-sans overflow-hidden">
            {/* Sidebar Navigation */}
            <aside className="w-64 border-r border-slate-200 bg-white flex flex-col items-start px-4 py-6 justify-between shadow-2xl z-10 shrink-0">
                <div className="w-full space-y-6">
                    {/* Header */}
                    <div className="flex flex-col gap-1 px-2 border-b border-slate-200 pb-4">
                        <div className="flex items-center gap-2">
                            <Building2 className="w-6 h-6 text-indigo-600" />
                            <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-slate-900 to-indigo-950 bg-clip-text text-transparent">Corporate Portal</span>
                        </div>
                        <span className="text-xs text-slate-500 truncate max-w-[200px]">Account: {session.user.name}</span>
                    </div>

                    {/* Navigation Items */}
                    <nav className="flex w-full flex-col gap-1">
                        <Link href="/b2b">
                            <span className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-600 hover:text-indigo-600 hover:bg-indigo-50/50 transition-colors">
                                <Calendar className="w-4 h-4" /> Bookings
                            </span>
                        </Link>
                        <Link href="/b2b/ledger">
                            <span className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-600 hover:text-indigo-600 hover:bg-indigo-50/50 transition-colors">
                                <FileText className="w-4 h-4" /> Account Ledger
                            </span>
                        </Link>
                    </nav>
                </div>

                {/* Footer Section (Logout) */}
                <div className="px-2 w-full pt-4 border-t border-slate-200">
                    <form action="/api/auth/signout" method="POST">
                        <Button
                             variant="ghost"
                             className="w-full flex items-center justify-start gap-3 rounded-md text-sm text-slate-500 hover:text-red-600 hover:bg-red-50/80 transition-colors px-3 h-10"
                             type="submit"
                        >
                            <LogOut className="w-4 h-4" />
                            Sign out
                        </Button>
                    </form>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 overflow-y-auto bg-slate-50 relative">
                {/* Subtle gradient background effect */}
                <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-indigo-500/5 to-transparent pointer-events-none -z-0"></div>
                <div className="relative z-10 h-full p-8 max-w-7xl mx-auto flex flex-col h-full">
                    {children}
                </div>
            </main>
        </div>
    );
}
