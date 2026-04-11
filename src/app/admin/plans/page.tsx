"use client";

import { useEffect, useState } from "react";
import { Plus, Edit, Trash2, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface SaasPlan {
    id: string;
    name: string;
    priceMonthly: number;
    priceAnnually: number;
    stripeProductId: string | null;
    stripePriceId: string | null;

    incZonePricing: boolean;
    incDynamicPricing: boolean;
    incAutoDispatch: boolean;
    incWaitReturn: boolean;
    incWebBooker: boolean;
    incB2bPortal: boolean;
    incWavOptions: boolean;
    incLiveTracking: boolean;
    incWebChatAi: boolean;
    incWhatsAppAi: boolean;
    incVoiceAi: boolean;
}

export default function SaaSPlansPage() {
    const [plans, setPlans] = useState<SaasPlan[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedPlan, setSelectedPlan] = useState<SaasPlan | null>(null);
    const [isEditing, setIsEditing] = useState(false);

    useEffect(() => {
        fetchPlans();
    }, []);

    const fetchPlans = async () => {
        try {
            const res = await fetch('/api/admin/plans');
            if (res.ok) {
                const data = await res.json();
                setPlans(data);
            }
        } catch (error) {
            console.error("Failed to fetch plans", error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateNew = () => {
        setSelectedPlan({
            id: 'new',
            name: 'New Plan',
            priceMonthly: 0,
            priceAnnually: 0,
            stripeProductId: null,
            stripePriceId: null,
            incZonePricing: false,
            incDynamicPricing: false,
            incAutoDispatch: false,
            incWaitReturn: false,
            incWebBooker: false,
            incB2bPortal: false,
            incWavOptions: false,
            incLiveTracking: true,
            incWebChatAi: false,
            incWhatsAppAi: false,
            incVoiceAi: false,
        });
        setIsEditing(true);
    };

    const handleSave = async () => {
        if (!selectedPlan) return;
        
        try {
            const method = selectedPlan.id === 'new' ? 'POST' : 'PUT';
            const url = selectedPlan.id === 'new' ? '/api/admin/plans' : `/api/admin/plans/${selectedPlan.id}`;
            
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(selectedPlan)
            });

            if (res.ok) {
                await fetchPlans();
                setIsEditing(false);
                setSelectedPlan(null);
            } else {
                alert("Failed to save plan.");
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this plan? It cannot be assigned to any active tenants.")) return;

        try {
            const res = await fetch(`/api/admin/plans/${id}`, { method: 'DELETE' });
            if (res.ok) {
                await fetchPlans();
            } else {
                const text = await res.json();
                alert(`Error: ${text.error}`);
            }
        } catch (error) {
            console.error(error);
        }
    };

    if (loading) {
        return <div className="p-8 text-center text-slate-500">Loading SaaS Configuration...</div>;
    }

    if (isEditing && selectedPlan) {
        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight">{selectedPlan.id === 'new' ? 'Create SaaS Plan' : 'Edit SaaS Plan'}</h2>
                        <p className="text-slate-500">Configure pricing and feature module access for this tier.</p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => { setIsEditing(false); setSelectedPlan(null); }}>Cancel</Button>
                        <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-500">Save Configuration</Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="col-span-1 space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Plan Identity</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Plan Name</label>
                                    <input 
                                        type="text" 
                                        className="w-full p-2 border rounded-md" 
                                        value={selectedPlan.name} 
                                        onChange={e => setSelectedPlan({...selectedPlan, name: e.target.value})} 
                                        placeholder="e.g. Executive Tier"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Monthly Price ($)</label>
                                        <input 
                                            type="number" 
                                            className="w-full p-2 border rounded-md" 
                                            value={selectedPlan.priceMonthly} 
                                            onChange={e => setSelectedPlan({...selectedPlan, priceMonthly: parseFloat(e.target.value) || 0})} 
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Annual Price ($)</label>
                                        <input 
                                            type="number" 
                                            className="w-full p-2 border rounded-md" 
                                            value={selectedPlan.priceAnnually} 
                                            onChange={e => setSelectedPlan({...selectedPlan, priceAnnually: parseFloat(e.target.value) || 0})} 
                                        />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Stripe Sync</CardTitle>
                                <CardDescription>Optionally link this to a Stripe Product.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-500">Stripe Product ID</label>
                                    <input 
                                        type="text" 
                                        className="w-full p-2 border rounded-md" 
                                        value={selectedPlan.stripeProductId || ""} 
                                        onChange={e => setSelectedPlan({...selectedPlan, stripeProductId: e.target.value})} 
                                        placeholder="prod_XYZ"
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="col-span-2">
                        <Card>
                            <CardHeader>
                                <CardTitle>Unlocked Feature Modules</CardTitle>
                                <CardDescription>Select the features that are automatically enabled for any tenant on this plan.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {[
                                        { field: 'incAutoDispatch', label: 'Auto-Dispatch Engine' },
                                        { field: 'incZonePricing', label: 'Zone Pricing Module' },
                                        { field: 'incDynamicPricing', label: 'Dynamic Pricing (Surge)' },
                                        { field: 'incWaitReturn', label: 'Wait & Return Engine' },
                                        { field: 'incWebBooker', label: 'Web Booking Widget' },
                                        { field: 'incB2bPortal', label: 'Corporate B2B Portal' },
                                        { field: 'incWavOptions', label: 'WAV Dispatching' },
                                        { field: 'incLiveTracking', label: 'Live Tracking Links' },
                                        { field: 'incWebChatAi', label: 'AI Web Chat' },
                                        { field: 'incWhatsAppAi', label: 'AI WhatsApp Agent' },
                                        { field: 'incVoiceAi', label: 'AI Voice Phone Agent' }
                                    ].map(mod => (
                                        <div key={mod.field} className="flex items-start space-x-3 p-3 border rounded-md hover:bg-slate-50 transition-colors">
                                            <input 
                                                type="checkbox"
                                                id={mod.field}
                                                checked={(selectedPlan as any)[mod.field]}
                                                onChange={e => setSelectedPlan({ ...selectedPlan, [mod.field]: e.target.checked })}
                                                className="w-4 h-4 mt-0.5 accent-blue-600"
                                            />
                                            <label htmlFor={mod.field} className="text-sm font-medium cursor-pointer flex-1">
                                                {mod.label}
                                            </label>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">SaaS Plans & Pricing</h2>
                    <p className="text-slate-500">Create subscription tiers and define module restrictions.</p>
                </div>
                <Button onClick={handleCreateNew} className="bg-slate-900 text-white hover:bg-slate-800">
                    <Plus className="w-4 h-4 mr-2" /> Create Model
                </Button>
            </div>

            {plans.length === 0 ? (
                <div className="text-center p-12 bg-white rounded-xl border border-dashed border-slate-300">
                    <h3 className="font-medium text-slate-900">No Plans Configured</h3>
                    <p className="text-sm text-slate-500 mt-1">Create a plan to start gating feature access.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {plans.map(plan => (
                        <Card key={plan.id} className="flex flex-col relative overflow-hidden group border-slate-200 hover:border-blue-300 transition-colors">
                            <div className="absolute top-4 right-4 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => { setSelectedPlan(plan); setIsEditing(true); }} className="p-1.5 bg-white shadow-sm border rounded hover:bg-slate-50 text-slate-600">
                                    <Edit className="w-4 h-4" />
                                </button>
                                <button onClick={() => handleDelete(plan.id)} className="p-1.5 bg-white shadow-sm border rounded hover:bg-red-50 text-red-500">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                            
                            <CardHeader className="pb-4">
                                <CardTitle className="text-xl">{plan.name}</CardTitle>
                                <CardDescription className="text-2xl font-bold text-slate-900 mt-2">
                                    ${plan.priceMonthly}<span className="text-sm font-normal text-slate-500"> /mo</span>
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="flex-1 flex flex-col">
                                <div className="space-y-2 mb-4 flex-1">
                                    <p className="text-xs font-semibold text-slate-400 uppercase">Included Modules</p>
                                    <div className="flex flex-wrap gap-2">
                                        {plan.incWebBooker && <span className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded-md border border-blue-100">Web Booker</span>}
                                        {plan.incB2bPortal && <span className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded-md border border-blue-100">B2B Portal</span>}
                                        {plan.incAutoDispatch && <span className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded-md border border-blue-100">Auto-Dispatch</span>}
                                        {plan.incWebChatAi && <span className="text-xs px-2 py-1 bg-purple-50 text-purple-700 rounded-md border border-purple-100">AI Chat</span>}
                                        {/* Summarize rest to prevent massive cards */}
                                        <span className="text-xs px-2 py-1 bg-slate-100 text-slate-600 rounded-md">
                                            + {[plan.incZonePricing, plan.incDynamicPricing, plan.incWaitReturn, plan.incWavOptions, plan.incLiveTracking, plan.incWhatsAppAi, plan.incVoiceAi].filter(Boolean).length} more features
                                        </span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
