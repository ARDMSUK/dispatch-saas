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
        <div className="flex min-h-screen bg-zinc-950 text-zinc-100">
            {/* Admin Sidebar */}
            <aside className="w-64 border-r border-zinc-800 bg-zinc-900 hidden md:flex flex-col">
                <div className="p-6 border-b border-zinc-800">
                    <div className="flex items-center gap-2 font-bold text-xl text-red-500">
                        <Shield className="w-6 h-6" />
                        <span>Super Admin</span>
                    </div>
                </div>

                <nav className="flex-1 p-4 space-y-2">
                    <Link href="/admin/tenants" className="flex items-center gap-2 px-4 py-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-md transition-colors">
                        <Building2 className="w-4 h-4" />
                        Tenants
                    </Link>
                    {/* Add more admin links here later */}
                </nav>

                <div className="p-4 border-t border-zinc-800 space-y-2">
                    <div className="px-4 py-2 text-xs text-zinc-500">
                        Signed in as {session.user.email}
                    </div>
                    <Link href="/dashboard">
                        <Button variant="outline" className="w-full justify-start text-zinc-400 border-zinc-700 hover:bg-zinc-800 hover:text-white">
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
                <header className="h-16 border-b border-zinc-800 flex items-center justify-between px-6 bg-zinc-900/50 backdrop-blur-xl sticky top-0 z-10">
                    <h1 className="font-semibold text-lg">Platform Management</h1>
                </header>
                <div className="p-6 max-w-7xl mx-auto">
                    {children}
                </div>
            </main>
        </div>
    );
}
