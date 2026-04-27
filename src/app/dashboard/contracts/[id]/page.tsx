"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Users, MapPin, Bus, AlertCircle } from "lucide-react";

export default function ContractDetailPage() {
    const params = useParams();
    const router = useRouter();
    const [contract, setContract] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isCreatingRoute, setIsCreatingRoute] = useState(false);

    useEffect(() => {
        const fetchContract = async () => {
            try {
                const res = await fetch(`/api/contracts/${params?.id}`);
                if (res.ok) {
                    setContract(await res.json());
                }
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };
        fetchContract();
    }, [params?.id]);

    const handleCreateRoute = async () => {
        setIsCreatingRoute(true);
        try {
            const res = await fetch(`/api/routes/route`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contractId: params?.id,
                    name: `New Route - ${new Date().toLocaleDateString()}`
                })
            });

            if (res.ok) {
                const newRoute = await res.json();
                router.push(`/dashboard/contracts/${params?.id}/routes/${newRoute.id}/builder`);
            }
        } catch (error) {
            console.error(error);
            setIsCreatingRoute(false);
        }
    };

    if (loading) return <div className="p-10 text-slate-500">Loading contract...</div>;
    if (!contract) return <div className="p-10 text-red-500">Contract not found</div>;

    return (
        <div className="p-6 max-w-7xl mx-auto h-full overflow-auto space-y-6">
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">{contract.name}</h1>
                    <p className="text-slate-500 mt-1 font-mono">PO: {contract.purchaseOrderNo || "N/A"} • Ref: {contract.reference}</p>
                </div>
                <Button 
                    className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md"
                    onClick={handleCreateRoute}
                    disabled={isCreatingRoute}
                >
                    <Plus className="mr-2 h-4 w-4" /> 
                    {isCreatingRoute ? "Creating..." : "Build New Route"}
                </Button>
            </div>

            <div className="grid grid-cols-1 gap-4">
                <h2 className="text-xl font-semibold text-slate-800 border-b border-slate-200 pb-2 mt-4">Active Routes</h2>
                
                {contract.routes?.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-xl border border-slate-200 border-dashed">
                        <Bus className="mx-auto h-12 w-12 text-slate-300 mb-3" />
                        <h3 className="text-lg font-medium text-slate-900">No Routes Configured</h3>
                        <p className="text-slate-500 text-sm mt-1">This contract doesn't have any transport routes yet.</p>
                        <Button variant="outline" className="mt-4 border-indigo-200 text-indigo-700 bg-indigo-50" onClick={handleCreateRoute}>
                            Create First Route
                        </Button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {contract.routes?.map((route: any) => (
                            <Card key={route.id} className="border-slate-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer" onClick={() => router.push(`/dashboard/contracts/${params?.id}/routes/${route.id}/builder`)}>
                                <CardHeader className="bg-slate-50 border-b border-slate-100 pb-4">
                                    <div className="flex justify-between items-start">
                                        <CardTitle className="text-lg text-slate-800 line-clamp-1">{route.name}</CardTitle>
                                    </div>
                                    <div className="flex gap-2 mt-2">
                                        {route.requiresWav && <span className="text-[10px] font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded uppercase">WAV</span>}
                                        {route.requiresPa && <span className="text-[10px] font-bold bg-purple-100 text-purple-800 px-2 py-0.5 rounded uppercase">PA REQ</span>}
                                    </div>
                                </CardHeader>
                                <CardContent className="pt-4 space-y-3">
                                    <div className="flex items-center text-sm text-slate-600 gap-2">
                                        <MapPin className="h-4 w-4 text-slate-400" />
                                        <span>{route.stops?.length || 0} Stops Configured</span>
                                    </div>
                                    <div className="flex items-center text-sm text-slate-600 gap-2">
                                        <Users className="h-4 w-4 text-slate-400" />
                                        <span>{route.students?.length || 0} SEN Students</span>
                                    </div>
                                    <div className="pt-2 border-t border-slate-100 flex justify-end">
                                        <span className="text-xs font-medium text-indigo-600 hover:text-indigo-800">Edit Route &rarr;</span>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
