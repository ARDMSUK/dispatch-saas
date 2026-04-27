"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { ChevronLeft, Save, Building2, Key, Trash2, Layers, CreditCard, ShieldAlert } from "lucide-react";

export default function TenantConfigPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [tenant, setTenant] = useState<any>(null);
    const [plans, setPlans] = useState<any[]>([]);

    useEffect(() => {
        Promise.all([
            fetch(`/api/admin/tenants/${id}`).then(res => res.json()),
            fetch(`/api/admin/plans`).then(res => res.json())
        ]).then(([tenantData, plansData]) => {
            if (tenantData.error) {
                toast.error(tenantData.error);
            } else {
                setTenant(tenantData);
            }
            if (!plansData.error) {
                setPlans(plansData);
            }
            setLoading(false);
        }).catch(() => {
            toast.error("Failed to load data");
            setLoading(false);
        });
    }, [id]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setTenant({ ...tenant, [e.target.name]: e.target.value });
    };

    const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setTenant({ ...tenant, [e.target.name]: e.target.checked });
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            // Nullify if empty
            if (tenant.subscriptionPlanId === "") tenant.subscriptionPlanId = null;

            const res = await fetch(`/api/admin/tenants/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(tenant),
            });

            if (res.ok) {
                toast.success("Configuration saved");
                router.refresh();
            } else {
                const error = await res.json();
                toast.error(error.error || "Failed to save");
            }
        } catch (error) {
            toast.error("Error saving tenant");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!window.confirm(`Are you sure you want to delete the tenant "${tenant?.name}"? Building data (Jobs, Drivers, Vehicles, Users, pricing) will be permanently lost and cannot be undone.`)) {
            return;
        }

        try {
            const res = await fetch(`/api/admin/tenants/${id}`, { method: "DELETE" });
            if (res.ok) {
                toast.success("Tenant deleted successfully");
                router.push("/admin/tenants");
                router.refresh();
            } else {
                const error = await res.json();
                toast.error(error.error || "Failed to delete tenant");
            }
        } catch (error) {
            toast.error("Error deleting tenant");
        }
    };

    if (loading) return <div className="p-8 text-center text-slate-400">Loading Configuration...</div>;
    if (!tenant) return <div className="p-8 text-center text-red-500">Tenant not found</div>;

    // Find the currently assigned SaaS plan
    const activePlan = plans.find(p => p.id === tenant.subscriptionPlanId);

    // Helper to check if a feature is unlocked by the active plan
    const isPlanUnlocked = (featureField: string) => {
        if (!activePlan) return false;
        return activePlan[featureField] === true;
    };

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" onClick={() => router.back()}>
                        <ChevronLeft className="w-4 h-4 mr-2" /> Back
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold">{tenant.name}</h1>
                        <p className="text-slate-500">Tenant Management Console</p>
                    </div>
                </div>
                <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-500 min-w-[150px]">
                    {saving ? "Saving..." : <><Save className="w-4 h-4 mr-2" /> Save Changes</>}
                </Button>
            </div>

            <Tabs defaultValue="general" className="w-full">
                <TabsList className="grid w-full grid-cols-4 h-12 bg-slate-100 p-1 mb-6">
                    <TabsTrigger value="general" className="data-[state=active]:bg-white">General Info</TabsTrigger>
                    <TabsTrigger value="integrations" className="data-[state=active]:bg-white">API Keys</TabsTrigger>
                    <TabsTrigger value="saas" className="data-[state=active]:bg-white">SaaS Subscription</TabsTrigger>
                    <TabsTrigger value="danger" className="data-[state=active]:bg-red-50 data-[state=active]:text-red-700">Danger Zone</TabsTrigger>
                </TabsList>

                {/* GENERAL TAB */}
                <TabsContent value="general" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Building2 className="w-5 h-5" /> Company Profile</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Business Name</label>
                                    <Input name="name" value={tenant.name} onChange={handleChange} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Tenant Slug (Immutable)</label>
                                    <Input name="slug" value={tenant.slug} disabled className="opacity-50" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Contact Email</label>
                                <Input name="email" value={tenant.email || ''} onChange={handleChange} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Phone</label>
                                    <Input name="phone" value={tenant.phone || ''} onChange={handleChange} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Address</label>
                                    <Input name="address" value={tenant.address || ''} onChange={handleChange} />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* INTEGRATIONS TAB */}
                <TabsContent value="integrations" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Key className="w-5 h-5" /> External Services</CardTitle>
                            <CardDescription>Configure external API keys required to power this tenant's infrastructure.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-8">
                            <div className="space-y-4">
                                <h3 className="text-sm font-bold text-teal-600 uppercase tracking-wider border-b pb-2">Tenant API Key</h3>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Public API Key</label>
                                    <Input readOnly value={tenant.apiKey || ''} className="text-slate-500 font-mono text-xs bg-slate-50" />
                                    <p className="text-xs text-slate-500">Used for embedding the Web Booker and Web Chat Widget publicly.</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h3 className="text-sm font-bold text-blue-600 uppercase tracking-wider border-b pb-2">Stripe</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Secret Key</label>
                                        <Input name="stripeSecretKey" type="password" value={tenant.stripeSecretKey || ''} onChange={handleChange} />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Publishable Key</label>
                                        <Input name="stripePublishableKey" value={tenant.stripePublishableKey || ''} onChange={handleChange} />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h3 className="text-sm font-bold text-sky-600 uppercase tracking-wider border-b pb-2">Twilio</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Account SID</label>
                                        <Input name="twilioAccountSid" value={tenant.twilioAccountSid || ''} onChange={handleChange} />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Auth Token</label>
                                        <Input name="twilioAuthToken" type="password" value={tenant.twilioAuthToken || ''} onChange={handleChange} />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">From Number</label>
                                        <Input name="twilioFromNumber" value={tenant.twilioFromNumber || ''} onChange={handleChange} />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Subaccount ID (WhatsApp)</label>
                                        <Input name="twilioSubaccountId" value={tenant.twilioSubaccountId || ''} onChange={handleChange} />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <h3 className="text-sm font-bold text-emerald-600 uppercase tracking-wider border-b pb-2">Resend (Email)</h3>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">API Key</label>
                                        <Input name="resendApiKey" type="password" value={tenant.resendApiKey || ''} onChange={handleChange} />
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <h3 className="text-sm font-bold text-indigo-600 uppercase tracking-wider border-b pb-2">AviationStack</h3>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">API Key</label>
                                        <Input name="aviationStackApiKey" type="password" value={tenant.aviationStackApiKey || ''} onChange={handleChange} placeholder="Optional" />
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* SAAS SUBSCRIPTION TAB */}
                <TabsContent value="saas" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><CreditCard className="w-5 h-5" /> Assigned SaaS Plan</CardTitle>
                            <CardDescription>Assign this tenant to a subscription tier to automatically unlock modules.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Active Subscription Plan</label>
                                    <select 
                                        name="subscriptionPlanId"
                                        value={tenant.subscriptionPlanId || ''}
                                        onChange={handleChange}
                                        className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                                    >
                                        <option value="">No Custom Plan Assigned</option>
                                        {plans.map(p => (
                                            <option key={p.id} value={p.id}>{p.name} (${p.priceMonthly}/mo)</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Subscription Status</label>
                                    <select 
                                        name="subscriptionStatus"
                                        value={tenant.subscriptionStatus || 'TRIALING'}
                                        onChange={handleChange}
                                        className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                                    >
                                        <option value="TRIALING">Trialing</option>
                                        <option value="ACTIVE">Active</option>
                                        <option value="PAST_DUE">Past Due</option>
                                        <option value="CANCELED">Canceled</option>
                                    </select>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Layers className="w-5 h-5" /> Module Customization</CardTitle>
                            <CardDescription>Feature modules automatically unlock based on the assigned plan. You can manually check boxes here to override and grant extra access.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {[
                                    { stateField: 'autoDispatch', planField: 'incAutoDispatch', label: 'Auto-Dispatch Engine' },
                                    { stateField: 'useZonePricing', planField: 'incZonePricing', label: 'Zone Pricing Module' },
                                    { stateField: 'enableDynamicPricing', planField: 'incDynamicPricing', label: 'Dynamic Pricing (Surge)' },
                                    { stateField: 'enableWaitCalculations', planField: 'incWaitReturn', label: 'Wait & Return Engine' },
                                    { stateField: 'enableWebBooker', planField: 'incWebBooker', label: 'Web Booking Widget' },
                                    { stateField: 'enableB2BPortal', planField: 'incB2bPortal', label: 'Corporate B2B Portal' },
                                    { stateField: 'enableWavOptions', planField: 'incWavOptions', label: 'WAV Dispatching' },
                                    { stateField: 'enableLiveTracking', planField: 'incLiveTracking', label: 'Live Tracking Links' },
                                    { stateField: 'hasWebChatAi', planField: 'incWebChatAi', label: 'AI Web Chat Widget' },
                                    { stateField: 'hasWhatsAppAi', planField: 'incWhatsAppAi', label: 'WhatsApp AI Agent' },
                                    { stateField: 'hasVoiceAi', planField: 'incVoiceAi', label: 'Voice AI Agent' },
                                    { stateField: 'hasSchoolContracts', planField: 'incSchoolContracts', label: 'School Contracts Add-on' }
                                ].map(mod => {
                                    const isPlanGranted = isPlanUnlocked(mod.planField);
                                    const isManuallyGranted = tenant[mod.stateField] === true;
                                    
                                    return (
                                        <div key={mod.stateField} className={`flex items-start space-x-3 p-3 rounded border transition-colors ${isPlanGranted ? 'bg-blue-50 border-blue-200' : 'bg-white border-slate-200'}`}>
                                            <input
                                                type="checkbox"
                                                name={mod.stateField}
                                                id={mod.stateField}
                                                checked={isPlanGranted || isManuallyGranted}
                                                disabled={isPlanGranted}
                                                onChange={handleCheckboxChange}
                                                className="w-4 h-4 mt-0.5 accent-blue-600 cursor-pointer disabled:opacity-50"
                                            />
                                            <div className="space-y-1">
                                                <label htmlFor={mod.stateField} className="text-sm font-medium cursor-pointer">
                                                    {mod.label}
                                                </label>
                                                {isPlanGranted ? (
                                                    <p className="text-xs text-blue-600 font-medium">Included in Active Plan</p>
                                                ) : (
                                                    <p className="text-xs text-slate-500">Custom Toggle</p>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Embed Codes Contextually Displayed */}
                            {(isPlanUnlocked('incWebBooker') || tenant.enableWebBooker) && (
                                <div className="mt-8 space-y-4 pt-6 border-t border-slate-200 max-w-2xl">
                                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Web Booking Widget (Embed Code)</h3>
                                    <p className="text-sm text-slate-500">Copy this HTML snippet to embed the instant-booking pipeline onto a website.</p>
                                    <div className="bg-slate-900 p-4 rounded-md overflow-x-auto relative shadow-inner">
                                        <code className="text-emerald-400 font-mono text-xs whitespace-pre-wrap">
                                            {`<iframe src="https://dispatch-saas.vercel.app/booker/${tenant.slug}?embed=true" width="100%" height="800px" frameborder="0" style="border-radius: 12px; border: 1px solid #e2e8f0;"></iframe>`}
                                        </code>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* DANGER ZONE TAB */}
                <TabsContent value="danger" className="space-y-6">
                    <Card className="border-red-200 bg-red-50/30">
                        <CardHeader>
                            <CardTitle className="text-red-700 flex items-center gap-2"><ShieldAlert className="w-5 h-5" /> Danger Zone</CardTitle>
                            <CardDescription className="text-red-600/80">Irreversible actions that will permanently destroy data.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="rounded-lg border border-red-200 bg-white p-6 flex items-center justify-between">
                                <div>
                                    <h4 className="font-semibold text-slate-900">Delete Tenant Infrastructure</h4>
                                    <p className="text-sm text-slate-500">Permanently destroys the tenant, including all jobs, drivers, logs, and accounts.</p>
                                </div>
                                <Button variant="destructive" onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Delete Tenant
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
