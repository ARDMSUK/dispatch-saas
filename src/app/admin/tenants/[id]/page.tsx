"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { ChevronLeft, Save, Building2, Key, Trash2, Layers, CreditCard } from "lucide-react";

export default function TenantConfigPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [tenant, setTenant] = useState<any>(null);

    // Fetch Tenant Data
    useEffect(() => {
        fetch(`/api/admin/tenants/${id}`)
            .then(res => res.json())
            .then(data => {
                if (data.error) {
                    toast.error(data.error);
                } else {
                    setTenant(data);
                }
                setLoading(false);
            })
            .catch(() => {
                toast.error("Failed to load tenant");
                setLoading(false);
            });
    }, [id]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setTenant({ ...tenant, [e.target.name]: e.target.value });
    };

    const handleSave = async () => {
        setSaving(true);
        try {
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
            const res = await fetch(`/api/admin/tenants/${id}`, {
                method: "DELETE",
            });

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

    if (loading) return <div className="p-8 text-center text-slate-400">Loading...</div>;
    if (!tenant) return <div className="p-8 text-center text-red-500">Tenant not found</div>;

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center gap-4 mb-8">
                <Button variant="ghost" onClick={() => router.back()}>
                    <ChevronLeft className="w-4 h-4 mr-2" /> Back
                </Button>
                <h1 className="text-2xl font-bold">{tenant.name} Configuration</h1>
            </div>

            <div className="grid gap-6">
                <Card className="bg-slate-100 border-slate-200">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Building2 className="w-5 h-5" />
                            Company Details
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Name</label>
                                <Input name="name" value={tenant.name} onChange={handleChange} className="bg-white border-slate-200" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Slug</label>
                                <Input name="slug" value={tenant.slug} disabled className="bg-white border-slate-200 opacity-50 cursor-not-allowed" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Contact Email</label>
                            <Input name="email" value={tenant.email || ''} onChange={handleChange} className="bg-white border-slate-200" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Phone</label>
                                <Input name="phone" value={tenant.phone || ''} onChange={handleChange} className="bg-white border-slate-200" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Address</label>
                                <Input name="address" value={tenant.address || ''} onChange={handleChange} className="bg-white border-slate-200" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-slate-100 border-slate-200">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Key className="w-5 h-5" />
                            API Integrations
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-4">
                            <h3 className="text-sm font-bold text-teal-500 uppercase tracking-wider">Tenant API Key</h3>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Read-Only API Key (Used for Web Chat Widget)</label>
                                <Input readOnly value={tenant.apiKey || ''} className="bg-white border-slate-200 text-slate-500 cursor-not-allowed font-mono text-xs" />
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h3 className="text-sm font-bold text-blue-700 uppercase tracking-wider">Stripe</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Secret Key</label>
                                    <Input name="stripeSecretKey" type="password" value={tenant.stripeSecretKey || ''} onChange={handleChange} className="bg-white border-slate-200" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Publishable Key</label>
                                    <Input name="stripePublishableKey" value={tenant.stripePublishableKey || ''} onChange={handleChange} className="bg-white border-slate-200" />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h3 className="text-sm font-bold text-blue-500 uppercase tracking-wider">Twilio</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Account SID</label>
                                    <Input name="twilioAccountSid" value={tenant.twilioAccountSid || ''} onChange={handleChange} className="bg-white border-slate-200" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Auth Token</label>
                                    <Input name="twilioAuthToken" type="password" value={tenant.twilioAuthToken || ''} onChange={handleChange} className="bg-white border-slate-200" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">From Number</label>
                                <Input name="twilioFromNumber" value={tenant.twilioFromNumber || ''} onChange={handleChange} className="bg-white border-slate-200" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Twilio Subaccount ID (WhatsApp Isolation)</label>
                                <Input name="twilioSubaccountId" value={tenant.twilioSubaccountId || ''} onChange={handleChange} className="bg-white border-slate-200" />
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h3 className="text-sm font-bold text-green-500 uppercase tracking-wider">Resend</h3>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">API Key</label>
                                <Input name="resendApiKey" type="password" value={tenant.resendApiKey || ''} onChange={handleChange} className="bg-white border-slate-200" />
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h3 className="text-sm font-bold text-indigo-500 uppercase tracking-wider">AviationStack (Flights)</h3>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">API Key</label>
                                <Input name="aviationStackApiKey" type="password" value={tenant.aviationStackApiKey || ''} onChange={handleChange} className="bg-white border-slate-200" placeholder="Optional. Globally configured if left blank." />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-slate-100 border-slate-200">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Building2 className="w-5 h-5" />
                            Embed Widgets
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Web Booking Widget</h3>
                            <p className="text-sm text-slate-500 leading-relaxed">Copy this HTML snippet and give it to corporate clients (Hotels, Offices, Travel Agents) to embed your instant-booking pipeline directly onto their website.</p>
                        </div>
                        <div className="bg-slate-900 p-4 rounded-md overflow-x-auto relative">
                            <code className="text-green-400 font-mono text-xs whitespace-pre-wrap">
                                {`<iframe src="https://dispatch-saas.vercel.app/booker/${tenant.slug}?embed=true" width="100%" height="800px" frameborder="0" style="border-radius: 12px; box-shadow: 0px 10px 15px -3px rgba(0,0,0,0.1);"></iframe>`}
                            </code>
                        </div>
                    </CardContent>
                </Card>



                <Card className="bg-slate-100 border-slate-200">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <CreditCard className="w-5 h-5" />
                            SaaS Subscription & Modules
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Subscription Plan</label>
                                <select 
                                    name="subscriptionPlan"
                                    value={tenant.subscriptionPlan || ''}
                                    onChange={(e) => setTenant({ ...tenant, subscriptionPlan: e.target.value })}
                                    className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                                >
                                    <option value="">No Plan Selected</option>
                                    <option value="BASIC">Basic</option>
                                    <option value="PRO">Pro</option>
                                    <option value="ENTERPRISE">Enterprise</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Subscription Status</label>
                                <select 
                                    name="subscriptionStatus"
                                    value={tenant.subscriptionStatus || 'TRIALING'}
                                    onChange={(e) => setTenant({ ...tenant, subscriptionStatus: e.target.value })}
                                    className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                                >
                                    <option value="TRIALING">Trialing</option>
                                    <option value="ACTIVE">Active</option>
                                    <option value="PAST_DUE">Past Due</option>
                                    <option value="CANCELED">Canceled</option>
                                </select>
                            </div>
                        </div>

                        <div className="space-y-4 pt-4 border-t border-slate-200">
                            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                                <Layers className="w-4 h-4" /> Feature Modules
                            </h3>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* useZonePricing */}
                                <div className="flex items-start space-x-3 p-3 bg-white rounded border border-slate-200">
                                    <input
                                        type="checkbox"
                                        id="useZonePricing"
                                        checked={tenant.useZonePricing === true}
                                        onChange={(e) => setTenant({ ...tenant, useZonePricing: e.target.checked })}
                                        className="w-4 h-4 accent-blue-700 mt-0.5"
                                    />
                                    <div className="space-y-1">
                                        <label htmlFor="useZonePricing" className="text-sm font-medium cursor-pointer">Zone-based Pricing Module</label>
                                        <p className="text-xs text-slate-500">Enable advanced fixed pricing for custom geofenced zones.</p>
                                    </div>
                                </div>

                                {/* enableDynamicPricing */}
                                <div className="flex items-start space-x-3 p-3 bg-white rounded border border-slate-200">
                                    <input
                                        type="checkbox"
                                        id="enableDynamicPricing"
                                        checked={tenant.enableDynamicPricing === true}
                                        onChange={(e) => setTenant({ ...tenant, enableDynamicPricing: e.target.checked })}
                                        className="w-4 h-4 accent-blue-700 mt-0.5"
                                    />
                                    <div className="space-y-1">
                                        <label htmlFor="enableDynamicPricing" className="text-sm font-medium cursor-pointer">Dynamic Pricing (Surges)</label>
                                        <p className="text-xs text-slate-500">Enable time/date multiplier surcharges and rules.</p>
                                    </div>
                                </div>

                                {/* autoDispatch */}
                                <div className="flex items-start space-x-3 p-3 bg-white rounded border border-slate-200">
                                    <input
                                        type="checkbox"
                                        id="autoDispatch"
                                        checked={tenant.autoDispatch === true}
                                        onChange={(e) => setTenant({ ...tenant, autoDispatch: e.target.checked })}
                                        className="w-4 h-4 accent-blue-700 mt-0.5"
                                    />
                                    <div className="space-y-1">
                                        <label htmlFor="autoDispatch" className="text-sm font-medium cursor-pointer">Auto-Dispatch Engine</label>
                                        <p className="text-xs text-slate-500">Allow autonomous matching of drivers to incoming bookings.</p>
                                    </div>
                                </div>

                                {/* enableWaitCalculations */}
                                <div className="flex items-start space-x-3 p-3 bg-white rounded border border-slate-200">
                                    <input
                                        type="checkbox"
                                        id="enableWaitCalculations"
                                        checked={tenant.enableWaitCalculations === true}
                                        onChange={(e) => setTenant({ ...tenant, enableWaitCalculations: e.target.checked })}
                                        className="w-4 h-4 accent-blue-700 mt-0.5"
                                    />
                                    <div className="space-y-1">
                                        <label htmlFor="enableWaitCalculations" className="text-sm font-medium cursor-pointer">Wait & Return Module</label>
                                        <p className="text-xs text-slate-500">Enable automated calculation of waiting time costs.</p>
                                    </div>
                                </div>

                                {/* enableWebBooker */}
                                <div className="flex items-start space-x-3 p-3 bg-white rounded border border-slate-200">
                                    <input
                                        type="checkbox"
                                        id="enableWebBooker"
                                        checked={tenant.enableWebBooker === true}
                                        onChange={(e) => setTenant({ ...tenant, enableWebBooker: e.target.checked })}
                                        className="w-4 h-4 accent-blue-700 mt-0.5"
                                    />
                                    <div className="space-y-1">
                                        <label htmlFor="enableWebBooker" className="text-sm font-medium cursor-pointer">B2B Corporate Portal / App</label>
                                        <p className="text-xs text-slate-500">Allows creation of corporate account invoice dashboards and dispatching.</p>
                                    </div>
                                </div>

                                {/* enableWavOptions */}
                                <div className="flex items-start space-x-3 p-3 bg-white rounded border border-slate-200">
                                    <input
                                        type="checkbox"
                                        id="enableWavOptions"
                                        checked={tenant.enableWavOptions === true}
                                        onChange={(e) => setTenant({ ...tenant, enableWavOptions: e.target.checked })}
                                        className="w-4 h-4 accent-blue-700 mt-0.5"
                                    />
                                    <div className="space-y-1">
                                        <label htmlFor="enableWavOptions" className="text-sm font-medium cursor-pointer">Wheelchair Accessible Fleet</label>
                                        <p className="text-xs text-slate-500">Expose Wheelchair required settings throughout the workflow.</p>
                                    </div>
                                </div>
                                
                                {/* enableLiveTracking */}
                                <div className="flex items-start space-x-3 p-3 bg-white rounded border border-slate-200">
                                    <input
                                        type="checkbox"
                                        id="enableLiveTracking"
                                        checked={tenant.enableLiveTracking !== false}
                                        onChange={(e) => setTenant({ ...tenant, enableLiveTracking: e.target.checked })}
                                        className="w-4 h-4 accent-blue-700 mt-0.5"
                                    />
                                    <div className="space-y-1">
                                        <label htmlFor="enableLiveTracking" className="text-sm font-medium cursor-pointer">Live Tracking Web Links</label>
                                        <p className="text-xs text-slate-500">Enable secure passenger live tracking links in automated SMS.</p>
                                    </div>
                                </div>

                                {/* hasWebChatAi */}
                                <div className="flex items-start space-x-3 p-3 bg-white rounded border border-slate-200">
                                    <input
                                        type="checkbox"
                                        id="hasWebChatAi"
                                        checked={tenant.hasWebChatAi === true}
                                        onChange={(e) => setTenant({ ...tenant, hasWebChatAi: e.target.checked })}
                                        className="w-4 h-4 accent-blue-700 mt-0.5"
                                    />
                                    <div className="space-y-1">
                                        <label htmlFor="hasWebChatAi" className="text-sm font-medium cursor-pointer">AI Web Chat Widget</label>
                                        <p className="text-xs text-slate-500">Enable Cabot AI Web Chat embedding on website.</p>
                                    </div>
                                </div>

                                {/* hasWhatsAppAi */}
                                <div className="flex items-start space-x-3 p-3 bg-white rounded border border-slate-200">
                                    <input
                                        type="checkbox"
                                        id="hasWhatsAppAi"
                                        checked={tenant.hasWhatsAppAi === true}
                                        onChange={(e) => setTenant({ ...tenant, hasWhatsAppAi: e.target.checked })}
                                        className="w-4 h-4 accent-blue-700 mt-0.5"
                                    />
                                    <div className="space-y-1">
                                        <label htmlFor="hasWhatsAppAi" className="text-sm font-medium cursor-pointer">WhatsApp AI Agent</label>
                                        <p className="text-xs text-slate-500">Enable inbound Twilio WhatsApp routing to Cabot AI.</p>
                                    </div>
                                </div>

                                {/* hasVoiceAi */}
                                <div className="flex items-start space-x-3 p-3 bg-white rounded border border-slate-200">
                                    <input
                                        type="checkbox"
                                        id="hasVoiceAi"
                                        checked={tenant.hasVoiceAi === true}
                                        onChange={(e) => setTenant({ ...tenant, hasVoiceAi: e.target.checked })}
                                        className="w-4 h-4 accent-blue-700 mt-0.5"
                                    />
                                    <div className="space-y-1">
                                        <label htmlFor="hasVoiceAi" className="text-sm font-medium cursor-pointer">Voice AI Agent</label>
                                        <p className="text-xs text-slate-500">Enable AI-powered conversational voice dispatch mapping.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="flex justify-between items-center pt-6 pb-20">
                <Button variant="destructive" onClick={handleDelete} className="bg-red-900/50 hover:bg-red-900 text-red-200">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Tenant
                </Button>

                <Button onClick={handleSave} disabled={saving} className="bg-green-600 text-slate-900 hover:bg-green-500 min-w-[150px]">
                    {saving ? "Saving..." : (
                        <>
                            <Save className="w-4 h-4 mr-2" />
                            Save Changes
                        </>
                    )}
                </Button>
            </div>
        </div>
    );
}
