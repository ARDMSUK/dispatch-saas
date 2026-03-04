import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Shield, Building2, LogOut, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await auth();

    // Strict Super Admin Check
    // Note: For initial bootstrap, we might manually set a role in DB to SUPER_ADMIN
    if (session?.user?.role !== "SUPER_ADMIN") {
        redirect("/dashboard");
    }

    return (
        <div className="flex min-h-screen bg-white text-slate-900">
            {/* Admin Sidebar */}
            <aside className="w-64 border-r border-slate-200 bg-slate-100 hidden md:flex flex-col">
                <div className="p-6 border-b border-slate-200">
                    <div className="flex items-center gap-2 font-bold text-xl text-red-500">
                        <Shield className="w-6 h-6" />
                        <span>Super Admin</span>
                    </div>
                </div>

                <nav className="flex-1 p-4 space-y-2">
                    <Link href="/admin/tenants" className="flex items-center gap-2 px-4 py-2 text-slate-500 hover:text-slate-900 hover:bg-slate-200 rounded-md transition-colors">
                        <Building2 className="w-4 h-4" />
                        Tenants
                    </Link>
                    {/* Add more admin links here later */}
                </nav>

                <div className="p-4 border-t border-slate-200 space-y-2">
                    <div className="px-4 py-2 text-xs text-slate-400">
                        Signed in as {session.user.email}
                    </div>
                    <Link href="/dashboard">
                        <Button variant="outline" className="w-full justify-start text-slate-500 border-slate-300 hover:bg-slate-200 hover:text-slate-900">
                            <LayoutDashboard className="w-4 h-4 mr-2" />
                            Go to App
                        </Button>
                    </Link>
                    <form action={async () => {
                        "use server";
                        const { signOut } = await import("@/auth");
                        await signOut();
                    }}>
                        <Button variant="ghost" className="w-full justify-start text-red-400 hover:text-red-300 hover:bg-red-900/20">
                            <LogOut className="w-4 h-4 mr-2" />
                            Sign Out
                        </Button>
                    </form>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-auto">
                <header className="h-16 border-b border-slate-200 flex items-center justify-between px-6 bg-slate-100 backdrop-blur-xl sticky top-0 z-10">
                    <h1 className="font-semibold text-lg">Platform Management</h1>
                </header>
                <div className="p-6 max-w-7xl mx-auto">
                    {children}
                </div>
            </main>
        </div>
    );
}
