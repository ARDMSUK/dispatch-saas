import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Shield, Building2, LogOut, LayoutDashboard, CreditCard, Settings, TerminalSquare } from "lucide-react";
import { Button } from "@/components/ui/button";

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await auth();

    // Strict Super Admin Check
    if (session?.user?.role !== "SUPER_ADMIN") {
        redirect("/dashboard");
    }

    return (
        <div className="flex h-screen bg-slate-50 text-slate-900 overflow-hidden">
            {/* Premium Dark Sidebar */}
            <aside className="w-72 bg-slate-950 text-slate-300 hidden md:flex flex-col border-r border-slate-900 z-20 shadow-xl">
                <div className="h-16 px-6 flex items-center border-b border-slate-900/50 bg-slate-950/50 backdrop-blur-md">
                    <div className="flex items-center gap-3">
                        <div className="p-1.5 bg-red-500/10 rounded-lg border border-red-500/20">
                            <Shield className="w-5 h-5 text-red-500" />
                        </div>
                        <span className="font-bold text-lg tracking-tight text-white">Super Admin</span>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto py-6 px-4 space-y-8">
                    {/* Management Group */}
                    <div className="space-y-2">
                        <p className="px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Management</p>
                        <nav className="space-y-1">
                            <Link href="/admin" className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-slate-400 hover:text-slate-50 hover:bg-slate-900 rounded-lg transition-colors group">
                                <TerminalSquare className="w-4 h-4 text-slate-500 group-hover:text-slate-400" />
                                Overview
                            </Link>
                            <Link href="/admin/tenants" className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-slate-50 bg-slate-900 rounded-lg transition-colors border border-slate-800 shadow-sm">
                                <Building2 className="w-4 h-4 text-blue-400" />
                                Tenants
                            </Link>
                        </nav>
                    </div>

                    {/* SaaS & Billing Group */}
                    <div className="space-y-2">
                        <p className="px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Billing & Config</p>
                        <nav className="space-y-1">
                            <Link href="/admin/plans" className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-slate-400 hover:text-slate-50 hover:bg-slate-900 rounded-lg transition-colors group">
                                <CreditCard className="w-4 h-4 text-slate-500 group-hover:text-emerald-400" />
                                SaaS Plans
                            </Link>
                            <Link href="/dashboard/settings" className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-slate-400 hover:text-slate-50 hover:bg-slate-900 rounded-lg transition-colors group">
                                <Building2 className="w-4 h-4 text-slate-500 group-hover:text-blue-400" />
                                My Tenant Settings
                            </Link>
                            <Link href="/admin/settings" className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-slate-400 hover:text-slate-50 hover:bg-slate-900 rounded-lg transition-colors group">
                                <Settings className="w-4 h-4 text-slate-500 group-hover:text-slate-400" />
                                System Settings
                            </Link>
                        </nav>
                    </div>
                </div>

                <div className="p-4 border-t border-slate-900 bg-slate-950/80">
                    <div className="px-3 py-3 mb-2 rounded-lg bg-slate-900/50 border border-slate-800">
                        <p className="text-xs text-slate-400 truncate">Logged in as</p>
                        <p className="text-sm font-medium text-slate-200 truncate">{session.user.email}</p>
                    </div>
                    
                    <div className="space-y-2 mt-4">
                        <Link href="/dashboard" className="w-full">
                            <Button variant="outline" className="w-full justify-start border-slate-800 bg-slate-950 text-slate-300 hover:bg-slate-900 hover:text-white transition-all h-9">
                                <LayoutDashboard className="w-4 h-4 mr-2" />
                                Return to App
                            </Button>
                        </Link>
                        <form action={async () => {
                            "use server";
                            const { signOut } = await import("@/auth");
                            await signOut();
                        }}>
                            <Button variant="ghost" className="w-full justify-start text-red-400 hover:text-red-300 hover:bg-red-950/30 transition-all h-9">
                                <LogOut className="w-4 h-4 mr-2" />
                                Sign Out
                            </Button>
                        </form>
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col h-screen overflow-hidden bg-slate-50 relative">
                {/* Decorative background gradient */}
                <div className="absolute top-0 left-0 right-0 h-64 bg-gradient-to-b from-blue-900/5 to-transparent pointer-events-none" />
                
                <header className="h-16 flex items-center justify-between px-8 bg-white/50 backdrop-blur-xl border-b border-slate-200 z-10">
                    <div className="flex items-center text-sm font-medium text-slate-500">
                        Admin Console <span className="mx-2 text-slate-300">/</span> <span className="text-slate-900">System Management</span>
                    </div>
                </header>
                
                <div className="flex-1 overflow-y-auto p-8 relative z-0">
                    <div className="max-w-7xl mx-auto pb-12">
                        {children}
                    </div>
                </div>
            </main>
        </div>
    );
}
