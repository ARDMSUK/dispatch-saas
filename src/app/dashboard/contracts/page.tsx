import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Plus, Search, Building2, MapPin, Users, AlertCircle } from "lucide-react";

export default async function SchoolContractsPage() {
    const session = await auth();
    if (!session || !session.user) {
        redirect("/login");
    }

    const tenantId = (session.user as any).tenantId;

    // Fetch Contracts
    const contracts = await prisma.contract.findMany({
        where: { tenantId },
        include: {
            account: true,
            routes: true,
        },
        orderBy: { createdAt: 'desc' }
    });

    return (
        <div className="p-6 max-w-7xl mx-auto h-full overflow-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">School Contracts</h1>
                    <p className="text-slate-500 mt-1">Manage Local Authority SEN transport and home-to-school routes.</p>
                </div>
                <Button className="bg-blue-700 hover:bg-blue-800 text-white shadow-md">
                    <Plus className="mr-2 h-4 w-4" /> New Contract
                </Button>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                    <div className="text-slate-500 text-sm font-medium mb-1">Active Contracts</div>
                    <div className="text-2xl font-bold text-slate-900">{contracts.filter((c: any) => c.status === 'ACTIVE').length}</div>
                </div>
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                    <div className="text-slate-500 text-sm font-medium mb-1">Total Routes</div>
                    <div className="text-2xl font-bold text-slate-900">{contracts.reduce((acc: number, c: any) => acc + c.routes.length, 0)}</div>
                </div>
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                    <div className="text-slate-500 text-sm font-medium mb-1">Compliance Alerts</div>
                    <div className="text-2xl font-bold text-amber-600 flex items-center gap-2">
                        0 <AlertCircle className="h-4 w-4" />
                    </div>
                </div>
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                    <div className="text-slate-500 text-sm font-medium mb-1">Monthly Value</div>
                    <div className="text-2xl font-bold text-emerald-600">£0.00</div>
                </div>
            </div>

            {/* Contracts List */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                    <h2 className="font-semibold text-slate-800">Local Authority Contracts</h2>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search contracts..."
                            className="pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
                        />
                    </div>
                </div>

                <div className="divide-y divide-slate-100">
                    {contracts.length === 0 ? (
                        <div className="p-12 text-center text-slate-500">
                            <Building2 className="mx-auto h-12 w-12 text-slate-300 mb-3" />
                            <h3 className="text-lg font-medium text-slate-900 mb-1">No Contracts Found</h3>
                            <p className="text-sm">You haven't set up any school contracts yet.</p>
                            <Button variant="outline" className="mt-4 border-blue-200 text-blue-700 bg-blue-50">
                                Create First Contract
                            </Button>
                        </div>
                    ) : (
                        contracts.map((contract: any) => (
                            <div key={contract.id} className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between cursor-pointer group">
                                <div className="flex gap-4 items-center">
                                    <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                        <Building2 className="h-5 w-5 text-blue-700" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-semibold text-slate-900">{contract.name}</h3>
                                            <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-200">
                                                {contract.status}
                                            </span>
                                        </div>
                                        <p className="text-sm text-slate-500 flex items-center gap-2 mt-1">
                                            <span>Ref: {contract.reference}</span>
                                            <span>•</span>
                                            <span>{contract.account.name}</span>
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-6 text-sm text-slate-500">
                                    <div className="flex flex-col items-end">
                                        <div className="flex items-center gap-1 font-medium text-slate-700">
                                            <MapPin className="h-3.5 w-3.5" />
                                            {contract.routes.length} Routes
                                        </div>
                                    </div>
                                    <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                                        Manage
                                    </Button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
